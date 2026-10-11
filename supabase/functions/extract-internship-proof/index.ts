import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { encodeBase64 } from 'https://deno.land/std@0.208.0/encoding/base64.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface ExtractionRequest {
  documentUrl?: string
  driveUrl?: string
  fileBase64?: string
  mimeType?: string
  fileName?: string
  studentContext?: {
    studentName?: string
    full_name?: string
    regNo?: string
  }
}

interface StructuredInternshipFacts {
  student_name: string | null
  company_name: string | null
  internship_role: string | null
  start_date: string | null
  end_date: string | null
  duration_months: number | null
  paid_status: 'Paid' | 'Unpaid' | 'Unknown'
  stipend_if_present: string | null
  certificate_type: string | null
  company_category_if_confident: string | null
  confidence: number
  warnings: string[]
  processing_error: string | null
  model_used: string
  extracted_at: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const timestamp = new Date().toISOString()

  try {
    const body: ExtractionRequest = await req.json().catch(() => ({}))
    const {
      documentUrl,
      driveUrl,
      fileBase64,
      mimeType = 'application/pdf',
      fileName = 'document.pdf',
      studentContext = {},
    } = body

    const targetUrl = driveUrl || documentUrl || ''
    let finalBase64 = fileBase64 || ''
    let finalMimeType = mimeType
    let driveError: string | null = null

    // 1. Resolve Google Drive URL if provided
    if (!finalBase64 && targetUrl) {
      const driveFileId = extractGoogleDriveId(targetUrl)
      if (driveFileId) {
        const directDriveUrl = `https://drive.google.com/uc?export=download&id=${driveFileId}`
        try {
          const driveRes = await fetch(directDriveUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
            },
          })

          if (driveRes.ok) {
            const contentType = driveRes.headers.get('content-type') || ''
            // If Drive returns HTML login/interstitial page instead of file stream: link is private/inaccessible
            if (contentType.includes('text/html')) {
              driveError = "Google Drive link is private or inaccessible. Please ensure 'Anyone with the link' is set to Viewer, or upload the file directly."
            } else {
              finalMimeType = contentType.split(';')[0].trim() || 'application/pdf'
              const arrayBuffer = await driveRes.arrayBuffer()
              finalBase64 = encodeBase64(new Uint8Array(arrayBuffer))
            }
          } else {
            driveError = `Google Drive file fetch failed (HTTP status ${driveRes.status}). Ensure sharing is set to 'Anyone with the link'.`
          }
        } catch (fetchErr: unknown) {
          const msg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr)
          driveError = `Failed to download Google Drive document: ${msg}`
        }
      } else if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://')) {
        // Direct web URL fetch
        try {
          const fetchRes = await fetch(targetUrl)
          if (fetchRes.ok) {
            const contentType = fetchRes.headers.get('content-type')
            if (contentType) finalMimeType = contentType.split(';')[0].trim()
            const arrayBuffer = await fetchRes.arrayBuffer()
            finalBase64 = encodeBase64(new Uint8Array(arrayBuffer))
          }
        } catch (_e) {
          // Non-blocking fetch warning
        }
      }
    }

    const isDriveUrl = targetUrl && extractGoogleDriveId(targetUrl);
    if (finalMimeType === 'application/pdf') {
      const errMsg = isDriveUrl 
        ? "Google Drive PDF files are not supported. Please share the certificate as JPG or PNG."
        : "PDF files are not supported. Please upload your certificate as JPG or PNG.";
      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg,
          data: createErrorResult(errMsg, timestamp, 'none'),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['image/jpeg', 'image/png'].includes(finalMimeType)) {
      const errMsg = `Unsupported file type (${finalMimeType}). Please use JPG or PNG.`;
      return new Response(
        JSON.stringify({
          success: false,
          error: errMsg,
          data: createErrorResult(errMsg, timestamp, 'none'),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (driveError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: driveError,
          data: createErrorResult(driveError, timestamp, 'none'),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!finalBase64 && !targetUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid document file, URL, or Google Drive reference provided',
          data: createErrorResult('No valid document file, URL, or Google Drive reference provided', timestamp, 'none'),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Determine Gemini Model dynamically from the API
    const apiKey = Deno.env.get('GEMINI_API_KEY') || Deno.env.get('DOCUMENT_OCR_KEY') || Deno.env.get('OPENAI_API_KEY')
    
    let fallbackModels = [Deno.env.get('GEMINI_MODEL') || 'gemini-1.5-flash']
    
    if (apiKey) {
      try {
        const modelsRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (modelsRes.ok) {
          const modelsData = await modelsRes.json();
          if (modelsData && modelsData.models) {
            // Filter models that support generateContent and are either flash or pro
            const supportedModels = modelsData.models
              .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
              .map((m: any) => m.name.replace('models/', ''));
            
            // Prioritize standard flash models, then pro, then anything else that's valid
            const preferred = supportedModels.filter((m: string) => m.includes('flash') && !m.includes('8b'));
            const backup = supportedModels.filter((m: string) => m.includes('pro'));
            const others = supportedModels.filter((m: string) => !m.includes('flash') && !m.includes('pro') && m.includes('gemini'));
            
            fallbackModels = [...preferred, ...backup, ...others];
          }
        }
      } catch (err) {
        console.warn("Could not fetch models list dynamically:", err);
      }
    }

    let lastGeminiError: string | null = null;
    let lastModelAttempted: string | null = null;
    
    if (apiKey && finalBase64 && fallbackModels.length > 0) {
      for (const modelName of fallbackModels) {
        try {
          lastModelAttempted = modelName;
          const geminiResult = await processWithGeminiModel(
            apiKey,
            modelName,
            finalBase64,
            finalMimeType,
            fileName,
            studentContext,
            timestamp
          )
          if (geminiResult) {
            return new Response(
              JSON.stringify({
                success: true,
                data: geminiResult,
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } catch (geminiErr: unknown) {
          const errMsg = geminiErr instanceof Error ? geminiErr.message : String(geminiErr)
          lastGeminiError = errMsg;
          console.warn(`Gemini model ${modelName} call notice:`, errMsg)
        }
      }
    }

    // 3. AI Extraction Failure / No key: Return confidence 0 with recorded processing error
    const failureMsg = apiKey
      ? 'Gemini multimodal document extraction could not process document format'
      : 'Server Gemini API key is missing or unconfigured'

    const errResult = createErrorResult(failureMsg, timestamp, lastModelAttempted || 'none');
    if (apiKey) {
      (errResult as any).debug = {
        mime_type: finalMimeType,
        has_base64: !!finalBase64,
        last_gemini_error: lastGeminiError,
      };
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: failureMsg,
        data: errResult,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Unhandled document processing exception'
    console.error('Server extraction exception:', errorMsg)

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMsg,
        data: createErrorResult(errorMsg, timestamp, 'none'),
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

/**
 * Helper to extract Google Drive file ID from sharing links
 */
function extractGoogleDriveId(url: string): string | null {
  if (!url) return null
  const fileDMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
  if (fileDMatch) return fileDMatch[1]
  const idParamMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/)
  if (idParamMatch) return idParamMatch[1]
  const openIdMatch = url.match(/\/open\?id=([a-zA-Z0-9_-]+)/)
  if (openIdMatch) return openIdMatch[1]
  const docMatch = url.match(/\/document\/d\/([a-zA-Z0-9_-]+)/)
  if (docMatch) return docMatch[1]
  return null
}

/**
 * Multimodal document extraction using specified Gemini Flash model
 */
async function processWithGeminiModel(
  apiKey: string,
  modelName: string,
  base64Data: string,
  mimeType: string,
  fileName: string,
  studentContext: any,
  timestamp: string
): Promise<StructuredInternshipFacts | null> {
  const expectedStudentName = studentContext.studentName || studentContext.full_name || ''

  const prompt = `
You are an authoritative document extraction engine for institutional placement verification.
Analyze the attached document (PDF or image certificate / offer letter) and extract FACTS ONLY.
Do NOT calculate marks or assign scores.

Return ONLY a valid JSON object matching this exact schema:

{
  "student_name": string or null,
  "company_name": string or null,
  "internship_role": string or null,
  "start_date": string or null (YYYY-MM-DD or readable string),
  "end_date": string or null (YYYY-MM-DD or readable string),
  "duration_months": number or null,
  "paid_status": "Paid" | "Unpaid" | "Unknown",
  "stipend_if_present": string or null,
  "certificate_type": string or null (e.g. "Completion Certificate", "Offer Letter", "Letter of Recommendation", "Experience Certificate"),
  "company_category_if_confident": string or null ("Tier 1 / SRM Placement", "Fortune 500", "Startup / Small-Mid Co", or null),
  "confidence": number between 0.0 and 1.0,
  "warnings": string[]
}

CRITICAL RULES:
1. Extract facts ONLY. Do NOT calculate marks.
2. Do NOT invent information. If a field is not present or cannot be reliably determined, set it to null or "Unknown" and add a clear string to "warnings".
3. Check for document anomalies and append warnings to "warnings":
   - "Unreadable document text" if text is blurry or corrupted
   - "Invalid/non-internship document" if document is not an internship proof
   - "Student name mismatch" if extracted student name does not match expected name: "${expectedStudentName}"
   - "Missing internship dates" if start_date or end_date is missing
   - "Ambiguous duration" if duration cannot be clearly determined
   - "Ambiguous paid status" if stipend/payment details are not clear
   - "Uncertain company classification" if company tier is unclear. Return null for company_category_if_confident instead of guessing.
4. Return ONLY valid JSON with no markdown wrapping.
`

  // Edge Functions lack native canvas/GraphicsMagick to render PDFs to images.
  // Per requirements, if reliable rendering is impossible, gracefully reject PDFs 
  // and accept image files directly for multimodal processing.
  if (mimeType === 'application/pdf') {
    throw new Error("Scanned PDF processing is currently unavailable. Please upload your certificate as an image file (PNG, JPG, JPEG).");
  }

  const documentPart = {
    inline_data: {
      mime_type: mimeType,
      data: base64Data,
    },
  };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            documentPart,
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        response_mime_type: 'application/json',
      },
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Gemini ${modelName} error (${response.status}): ${errText}`)
  }

  const json = await response.json()
  const rawText = json.candidates?.[0]?.content?.parts?.[0]?.text || ''
  if (!rawText) return null

  try {
    const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed = JSON.parse(cleanJson)

    const warnings: string[] = Array.isArray(parsed.warnings) ? parsed.warnings : []

    // Automatic student name mismatch check
    if (expectedStudentName && parsed.student_name) {
      const expClean = expectedStudentName.toLowerCase().trim()
      const extClean = parsed.student_name.toLowerCase().trim()
      const isMatch = expClean.includes(extClean) || extClean.includes(expClean) || expClean.split(' ')[0] === extClean.split(' ')[0]
      if (!isMatch && !warnings.some(w => w.toLowerCase().includes('name mismatch'))) {
        warnings.push(`Student name on certificate ("${parsed.student_name}") does not match profile ("${expectedStudentName}")`)
      }
    }

    const paidStatus = ['Paid', 'Unpaid', 'Unknown'].includes(parsed.paid_status)
      ? parsed.paid_status
      : parsed.paid_status === true ? 'Paid' : parsed.paid_status === false ? 'Unpaid' : 'Unknown'

    const confidence = typeof parsed.confidence === 'number' ? parsed.confidence : warnings.length > 0 ? 0.65 : 0.95

    return {
      student_name: parsed.student_name || null,
      company_name: parsed.company_name || null,
      internship_role: parsed.internship_role || null,
      start_date: parsed.start_date || null,
      end_date: parsed.end_date || null,
      duration_months: typeof parsed.duration_months === 'number' ? parsed.duration_months : Number(parsed.duration_months) || null,
      paid_status: paidStatus,
      stipend_if_present: parsed.stipend_if_present || null,
      certificate_type: parsed.certificate_type || null,
      company_category_if_confident: parsed.company_category_if_confident || null,
      confidence: Number(confidence.toFixed(2)),
      warnings: warnings,
      processing_error: null,
      model_used: modelName,
      extracted_at: timestamp,
    }
  } catch (parseErr) {
    console.warn('Could not parse Gemini JSON response:', parseErr)
    return null
  }
}

function createErrorResult(errorMsg: string, timestamp: string, model: string): StructuredInternshipFacts {
  return {
    student_name: null,
    company_name: null,
    internship_role: null,
    start_date: null,
    end_date: null,
    duration_months: null,
    paid_status: 'Unknown',
    stipend_if_present: null,
    certificate_type: null,
    company_category_if_confident: null,
    confidence: 0.0,
    warnings: [errorMsg],
    processing_error: errorMsg,
    model_used: model,
    extracted_at: timestamp,
  }
}
