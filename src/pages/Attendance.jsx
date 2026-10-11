import React, { useState, useCallback, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  Upload, FileSpreadsheet, X, AlertTriangle, Filter, Users,
  BookOpen, Search, Trash2, ChevronDown, ChevronUp, Check,
  SlidersHorizontal, RotateCcw,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// PARSERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clean a raw cell string — strips \r\n, trims whitespace.
 */
const clean = (v) => (v == null ? '' : String(v).replace(/[\r\n]+/g, ' ').trim());

/**
 * FORMAT A — Full-section attendance (e.g. P1.xlsx)
 *
 * Structure:
 *   Row 0: ["S.No", "Reg.No", "Name", "Slots A to G & X & O", null... , "LAB Slots", ...]
 *   Row 1+: ["1", "RA24...", "NAME", "CODE\r\nPCT", "CODE\r\nPCT", ...]
 *
 * Each subject cell is packed as "SUBJECTCODE\r\nATTENDANCE_PCT".
 * Columns 0-2 are fixed: sno, regNo, name. Cols 3+ are subject cells.
 */
function parseFormatA(rows) {
  // Row 0 is the header — first cell should be "S.No" or similar
  // Data starts from row 1
  const students = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    // Skip fully empty rows
    if (!r || r.every((c) => c == null || c === '')) continue;

    const snoRaw = r[0];
    const regNo = clean(r[1]);
    const name = clean(r[2]);

    // Must have a numeric sno and a regNo that looks like a registration number
    if (!snoRaw || !regNo || !name) continue;
    const sno = parseInt(String(snoRaw), 10);
    if (isNaN(sno)) continue;

    // Parse subject cells from col 3 onwards
    const subjects = [];
    for (let c = 3; c < r.length; c++) {
      const cell = r[c];
      if (cell == null || cell === '') continue;
      const cellStr = String(cell).trim();
      // Packed as "SUBJECTCODE\r\nPCT" or "SUBJECTCODE\nPCT"
      const splitChar = cellStr.includes('\r\n') ? '\r\n' : cellStr.includes('\n') ? '\n' : null;
      if (splitChar) {
        const parts = cellStr.split(splitChar);
        const code = parts[0].trim();
        const pct = parseFloat(parts[1]);
        if (code) subjects.push({ code, pct: isNaN(pct) ? null : pct });
      }
    }

    students.push({ sno, regNo, name, subjects });
  }
  return students;
}

/**
 * FORMAT B — Low-attendance report (e.g. P1_Low_Attendance_Fifth_Semester.xlsx)
 *
 * Structure:
 *   Rows 0–5: Institution header block (SRM INSTITUTE... / SECTION: / TOTAL NUMBER...)
 *   Row 6: Column headers: ["S.No", "Register Number", "Student Name", "Subject Code",
 *                           "Subject Name", "Attendance Percentage", "Mail sent to Parents",
 *                           "Parents Response", ...]
 *   Row 7+: Data rows. A student can span multiple rows:
 *     - First row: sno | regNo | name | subjectCode | subjectName | pct | mail | parentResp
 *     - Continuation rows: null | null | null | subjectCode | subjectName | pct | mail | parentResp
 *
 * Returns: { meta, students }
 */
function parseFormatB(rows) {
  // Find the header row by looking for "S.No" + "Register Number"
  let headerIdx = -1;
  for (let i = 0; i < Math.min(15, rows.length); i++) {
    const r = rows[i];
    if (!r) continue;
    const hasSnO = r.some((c) => clean(c) === 'S.No');
    const hasReg = r.some((c) => clean(c).toLowerCase().includes('register'));
    if (hasSnO && hasReg) { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { meta: {}, students: [] };

  // Extract meta from rows before header
  const meta = {};
  for (let i = 0; i < headerIdx; i++) {
    const r = rows[i];
    if (!r) continue;
    r.forEach((cell, ci) => {
      const s = clean(cell).toLowerCase();
      if (s.includes('section:')) {
        // Value might be in same cell after "SECTION:" or in next cell
        const val = clean(cell).replace(/section:/i, '').trim();
        meta.section = val || clean(r[ci + 1]);
      }
      if (s.includes('faculty advisor:')) {
        const val = clean(cell).replace(/faculty advisor:/i, '').trim();
        meta.facultyAdvisor = val || clean(r[ci + 1]);
      }
      if (s.includes('academic advisor:')) {
        const val = clean(cell).replace(/academic advisor:/i, '').trim();
        meta.academicAdvisor = val || clean(r[ci + 1]);
      }
      if (s.includes('total number')) {
        // Look ahead for " students: N" in same or next cells
        for (let j = ci; j < Math.min(ci + 4, r.length); j++) {
          const sv = clean(r[j]);
          const m = sv.match(/students[:\s]+(\d+)/i);
          if (m) { meta.totalStudents = m[1]; break; }
        }
      }
      if (s.includes('less than 75%')) {
        for (let j = ci + 1; j < Math.min(ci + 4, r.length); j++) {
          const v = clean(r[j]);
          if (v && !isNaN(parseInt(v))) { meta.lowCount = v; break; }
        }
      }
    });
  }

  // Map column indices from header row
  const hdr = rows[headerIdx];
  const colSno = hdr.findIndex((c) => clean(c) === 'S.No');
  const colReg = hdr.findIndex((c) => clean(c).toLowerCase().includes('register'));
  const colName = hdr.findIndex((c) => clean(c).toLowerCase().includes('student name'));
  const colCode = hdr.findIndex((c) => clean(c).toLowerCase().includes('subject code'));
  const colSubName = hdr.findIndex((c) => clean(c).toLowerCase().includes('subject name'));
  const colPct = hdr.findIndex((c) => clean(c).toLowerCase().includes('attendance'));
  const colMail = hdr.findIndex((c) => clean(c).toLowerCase().includes('mail'));
  const colParent = hdr.findIndex((c) => clean(c).toLowerCase().includes('parent'));

  const students = [];
  let current = null;

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.every((c) => c == null || c === '')) continue;

    const snoRaw = colSno >= 0 ? r[colSno] : null;
    const regRaw = colReg >= 0 ? r[colReg] : null;
    const nameRaw = colName >= 0 ? r[colName] : null;
    const codeRaw = colCode >= 0 ? r[colCode] : null;
    const subNameRaw = colSubName >= 0 ? r[colSubName] : null;
    const pctRaw = colPct >= 0 ? r[colPct] : null;
    const mailRaw = colMail >= 0 ? r[colMail] : null;
    const parentRaw = colParent >= 0 ? r[colParent] : null;

    const pct = pctRaw != null && pctRaw !== '' ? parseFloat(String(pctRaw)) : null;
    const code = clean(codeRaw);
    const subName = clean(subNameRaw);

    // New student row: sno is present and is a number
    if (snoRaw != null && snoRaw !== '' && !isNaN(parseInt(String(snoRaw)))) {
      const regNo = clean(regRaw);
      const name = clean(nameRaw);
      // Only create new student if we have a valid reg number
      if (regNo && name) {
        current = {
          sno: parseInt(String(snoRaw), 10),
          regNo,
          name,
          subjects: [],
        };
        students.push(current);
      }
    }

    // Append subject to current student
    if (current && code) {
      current.subjects.push({
        code,
        name: subName,
        pct: isNaN(pct) ? null : pct,
        mailSent: clean(mailRaw),
        parentsResponse: clean(parentRaw),
      });
    }
  }

  return { meta, students };
}

/**
 * Detect which format a sheet is by inspecting its first row.
 * Format A: first row starts with "S.No" / "Reg.No" / "Name" directly (no institution header block)
 * Format B: first rows are institution header text (SRM INSTITUTE... / COLLEGE OF...)
 */
function detectFormat(rows) {
  if (!rows || rows.length === 0) return null;
  const r0 = rows[0] || [];
  const first = clean(r0[0]).toUpperCase();

  // Format A: first row is the data header
  if (first === 'S.NO' || first === 'S.No'.toUpperCase()) {
    // Check if col 3 header text mentions "Slots" (Format A specific)
    return 'A';
  }

  // Format B: first rows are institution header
  if (
    first.includes('SRM') ||
    first.includes('COLLEGE') ||
    first.includes('DEPARTMENT') ||
    first.includes('INSTITUTE')
  ) {
    // Verify there is a proper column header row later with "Subject Code" / "Subject Name"
    for (let i = 1; i < Math.min(12, rows.length); i++) {
      const r = rows[i] || [];
      const hasSnO = r.some((c) => clean(c) === 'S.No');
      const hasSubjectName = r.some((c) => clean(c).toLowerCase().includes('subject name'));
      if (hasSnO && hasSubjectName) return 'B';
    }
  }

  return null;
}

/**
 * Parse a single XLSX workbook into an array of sheet objects.
 */
function parseWorkbook(wb) {
  const result = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    // Use raw:false so numbers stay as strings (easier for parseFloat later)
    // But we want actual numbers for pct, so use raw:true and handle ourselves
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

    const fmt = detectFormat(rows);
    if (!fmt) continue; // skip unrecognised sheets

    if (fmt === 'A') {
      const students = parseFormatA(rows);
      if (students.length > 0) {
        result.push({ sheetName, format: 'A', meta: {}, students });
      }
    } else if (fmt === 'B') {
      const { meta, students } = parseFormatB(rows);
      if (students.length > 0) {
        result.push({ sheetName, format: 'B', meta, students });
      }
    }
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const LOW = 75;

const normalizeSubjectCode = (code) => {
  if (!code) return '';
  return clean(code).split('(')[0].trim().toUpperCase();
};

function getLowSubjects(student, deselectedSubjects = new Set()) {
  return (student.subjects || []).filter((s) => {
    const norm = normalizeSubjectCode(s.code);
    if (deselectedSubjects.has(norm)) return false;
    return s.pct !== null && s.pct < LOW;
  });
}

function hasLowAttendance(student, deselectedSubjects = new Set()) {
  return getLowSubjects(student, deselectedSubjects).length > 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function PctPill({ pct, excluded = false }) {
  if (pct === null || pct === undefined || isNaN(pct)) {
    return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>;
  }
  if (excluded) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        padding: '2px 8px', borderRadius: '999px', fontSize: '12px',
        fontWeight: 600, color: 'var(--text-muted)', background: 'var(--bg-hover)',
        border: '1px dashed var(--border)', fontFamily: 'monospace',
      }}>
        {pct.toFixed(2)}%
      </span>
    );
  }
  const isLow = pct < LOW;
  const isWarn = pct >= LOW && pct < 85;
  const color = isLow ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e';
  const bg = isLow ? 'rgba(239,68,68,0.1)' : isWarn ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '3px',
      padding: '2px 8px', borderRadius: '999px', fontSize: '12px',
      fontWeight: 700, color, background: bg,
      border: `1px solid ${color}44`, fontFamily: 'monospace',
    }}>
      {isLow && <AlertTriangle size={9} />}
      {pct.toFixed(2)}%
    </span>
  );
}

// ── Format A: one row per student, subject pills ──────────────────────────────
function FormatARow({ student, filterLow, deselectedSubjects = new Set() }) {
  const lowSubs = getLowSubjects(student, deselectedSubjects);
  const displaySubs = filterLow ? lowSubs : student.subjects;
  if (filterLow && lowSubs.length === 0) return null;

  return (
    <tr style={{
      borderTop: '1px solid var(--border)',
      background: lowSubs.length > 0 ? 'rgba(239,68,68,0.025)' : 'transparent',
    }}>
      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', fontWeight: 600 }}>{student.sno}</td>
      <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{student.regNo}</td>
      <td style={{ padding: '10px 14px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{student.name}</td>
      <td style={{ padding: '10px 14px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {displaySubs.map((sub, idx) => {
            const normCode = normalizeSubjectCode(sub.code);
            const isExcluded = deselectedSubjects.has(normCode);
            const isLow = !isExcluded && sub.pct !== null && sub.pct < LOW;
            return (
              <div key={idx} style={{
                display: 'inline-flex', flexDirection: 'column', alignItems: 'center',
                padding: '5px 8px', borderRadius: '8px', minWidth: '80px',
                border: isExcluded
                  ? '1px dashed var(--border)'
                  : `1px solid ${isLow ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                background: isExcluded
                  ? 'transparent'
                  : isLow ? 'rgba(239,68,68,0.06)' : 'var(--bg-hover)',
                opacity: isExcluded ? 0.55 : 1,
                gap: '3px',
                transition: 'all 0.15s ease',
              }} title={isExcluded ? `${sub.code} is excluded from attendance evaluation` : sub.code}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{
                    fontFamily: 'monospace', fontSize: '10px',
                    color: isExcluded ? 'var(--text-muted)' : 'var(--text-muted)',
                    textDecoration: isExcluded ? 'line-through' : 'none',
                    lineHeight: 1,
                  }}>
                    {sub.code.split('(')[0]}
                  </span>
                  {isExcluded && (
                    <span style={{ fontSize: '8px', padding: '1px 3px', borderRadius: '3px', background: 'var(--bg-hover)', color: 'var(--text-muted)', fontWeight: 600 }}>
                      OFF
                    </span>
                  )}
                </div>
                <PctPill pct={sub.pct} excluded={isExcluded} />
              </div>
            );
          })}
        </div>
      </td>
      <td style={{ padding: '10px 14px', textAlign: 'center' }}>
        {lowSubs.length > 0 ? (
          <span style={{
            padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
            color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
          }}>{lowSubs.length}</span>
        ) : (
          <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 600 }}>✓</span>
        )}
      </td>
    </tr>
  );
}

// ── Format B: student card with subject rows ──────────────────────────────────
function FormatBCard({ student, filterLow, deselectedSubjects = new Set() }) {
  const lowSubs = getLowSubjects(student, deselectedSubjects);
  const displaySubs = filterLow ? lowSubs : student.subjects;
  if (filterLow && lowSubs.length === 0) return null;

  const hasMailCol = student.subjects.some((s) => s.mailSent !== undefined && s.mailSent !== '');

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: `1px solid ${lowSubs.length > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
      borderRadius: '12px', overflow: 'hidden', marginBottom: '10px',
    }}>
      {/* Student header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '11px 16px', borderBottom: '1px solid var(--border)',
        background: lowSubs.length > 0 ? 'rgba(239,68,68,0.04)' : 'var(--bg-hover)',
      }}>
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'var(--bg-page)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: '12px', fontWeight: 700,
          color: 'var(--text-secondary)', flexShrink: 0,
        }}>{student.sno}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{student.name}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{student.regNo}</div>
        </div>
        {lowSubs.length > 0 ? (
          <span style={{
            padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
            color: '#ef4444', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            flexShrink: 0,
          }}>{lowSubs.length} below 75%</span>
        ) : (
          <span style={{
            padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
            color: '#22c55e', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            flexShrink: 0,
          }}>All considered ≥ 75%</span>
        )}
      </div>

      {/* Subject rows */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: 'var(--bg-hover)' }}>
              <th style={thStyle}>Subject Code</th>
              <th style={thStyle}>Subject Name</th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Attendance</th>
              {hasMailCol && <th style={{ ...thStyle, textAlign: 'center' }}>Mail Sent</th>}
              {hasMailCol && <th style={{ ...thStyle, textAlign: 'center' }}>Parent Response</th>}
            </tr>
          </thead>
          <tbody>
            {displaySubs.map((sub, idx) => {
              const normCode = normalizeSubjectCode(sub.code);
              const isExcluded = deselectedSubjects.has(normCode);
              const isLow = !isExcluded && sub.pct !== null && sub.pct < LOW;
              return (
                <tr key={idx} style={{
                  borderTop: '1px solid var(--border)',
                  background: isLow ? 'rgba(239,68,68,0.03)' : 'transparent',
                  opacity: isExcluded ? 0.55 : 1,
                }}>
                  <td style={{ padding: '8px 16px', fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    <span style={{ textDecoration: isExcluded ? 'line-through' : 'none' }}>{sub.code}</span>
                    {isExcluded && (
                      <span style={{ marginLeft: '6px', fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'var(--bg-hover)', color: 'var(--text-muted)' }}>
                        Excluded
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '8px 16px', color: 'var(--text-primary)' }}>{sub.name || '—'}</td>
                  <td style={{ padding: '8px 16px', textAlign: 'center' }}><PctPill pct={sub.pct} excluded={isExcluded} /></td>
                  {hasMailCol && <td style={{ padding: '8px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>{sub.mailSent || '—'}</td>}
                  {hasMailCol && <td style={{ padding: '8px 16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-secondary)' }}>{sub.parentsResponse || '—'}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const thStyle = {
  padding: '8px 16px', textAlign: 'left',
  color: 'var(--text-muted)', fontWeight: 600, fontSize: '11px',
  whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em',
};

// ── Sheet display wrapper ────────────────────────────────────────────────────
function SheetDisplay({ sheet, filterLow, searchQuery, deselectedSubjects = new Set() }) {
  const { sheetName, format, meta, students } = sheet;

  const visible = students.filter((st) => {
    const q = searchQuery.toLowerCase();
    if (q && !st.name.toLowerCase().includes(q) && !st.regNo.toLowerCase().includes(q)) return false;
    if (filterLow && !hasLowAttendance(st, deselectedSubjects)) return false;
    return true;
  });

  const lowCount = students.filter((st) => hasLowAttendance(st, deselectedSubjects)).length;

  return (
    <div style={{ marginBottom: '32px' }}>
      {/* Sheet meta banner */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px', marginBottom: '14px',
        padding: '14px 18px', background: 'var(--bg-card)',
        borderRadius: '12px', border: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
            <BookOpen size={15} style={{ color: 'var(--green)' }} />
            <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>{sheetName}</span>
            <span style={{
              padding: '2px 8px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
              color: 'var(--green)', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)',
            }}>Format {format}</span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px' }}>
            {meta.section && <MetaChip label="Section" value={meta.section} />}
            {meta.facultyAdvisor && <MetaChip label="Faculty Advisor" value={meta.facultyAdvisor} />}
            {meta.academicAdvisor && <MetaChip label="Academic Advisor" value={meta.academicAdvisor} />}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <StatBox n={students.length} label="Total" />
          <StatBox n={lowCount} label="Below 75%" color={lowCount > 0 ? '#ef4444' : undefined} />
        </div>
      </div>

      {/* Filtered empty state */}
      {visible.length === 0 ? (
        <div style={{
          padding: '40px', textAlign: 'center', color: 'var(--text-muted)',
          background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)',
          fontSize: '14px',
        }}>
          {filterLow ? 'No students with attendance below 75% found in the selected subjects.' : 'No students match your search.'}
        </div>
      ) : format === 'A' ? (
        /* Format A: table with subject pills per row */
        <div style={{ overflowX: 'auto', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'var(--bg-hover)' }}>
                <th style={{ ...thStyle, textAlign: 'center' }}>#</th>
                <th style={thStyle}>Reg No.</th>
                <th style={thStyle}>Name</th>
                <th style={thStyle}>Subjects & Attendance</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Below 75%</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((st) => (
                <FormatARow key={st.regNo} student={st} filterLow={filterLow} deselectedSubjects={deselectedSubjects} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Format B: expandable student cards */
        <div>
          {visible.map((st) => (
            <FormatBCard key={st.regNo + st.sno} student={st} filterLow={filterLow} deselectedSubjects={deselectedSubjects} />
          ))}
        </div>
      )}
    </div>
  );
}

function MetaChip({ label, value }) {
  return (
    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
      <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>{label}: </span>
      {value}
    </div>
  );
}

function StatBox({ n, label, color }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '20px', fontWeight: 800, color: color || 'var(--text-primary)', lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600, marginTop: '2px', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

// ── Upload drop zone ─────────────────────────────────────────────────────────
function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false);
  const ref = useRef(null);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
    if (files.length) onFiles(files);
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => ref.current?.click()}
      style={{
        border: `2px dashed ${dragging ? 'var(--green)' : 'var(--border)'}`,
        borderRadius: '14px', padding: '44px 24px', textAlign: 'center',
        cursor: 'pointer', transition: 'all 0.2s',
        background: dragging ? 'rgba(34,197,94,0.04)' : 'var(--bg-card)',
      }}
    >
      <input ref={ref} type="file" accept=".xlsx,.xls" multiple style={{ display: 'none' }}
        onChange={(e) => {
          const files = Array.from(e.target.files || []).filter((f) => /\.(xlsx|xls)$/i.test(f.name));
          if (files.length) onFiles(files);
          e.target.value = '';
        }}
      />
      <div style={{
        width: '52px', height: '52px', borderRadius: '14px', margin: '0 auto 14px',
        background: dragging ? 'rgba(34,197,94,0.12)' : 'var(--bg-hover)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
      }}>
        <Upload size={22} style={{ color: dragging ? 'var(--green)' : 'var(--text-muted)' }} />
      </div>
      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', marginBottom: '5px' }}>
        Drop your Excel attendance sheet here
      </div>
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>
        Supports the full-section format (P1.xlsx) and the low-attendance report format
      </div>
      <span style={{
        display: 'inline-block', padding: '6px 18px', borderRadius: '8px',
        fontSize: '13px', fontWeight: 600, color: 'var(--green)',
        border: '1px solid var(--green)', background: 'rgba(34,197,94,0.06)',
      }}>Browse files</span>
    </div>
  );
}

// ── Subject Code Filter Component ───────────────────────────────────────────
function SubjectFilterSection({
  availableSubjects,
  deselectedSubjects,
  onToggleSubject,
  onSelectAll,
  onDeselectAll,
}) {
  const [subSearch, setSubSearch] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const excludedCount = deselectedSubjects.size;
  const totalCount = availableSubjects.length;
  const consideredCount = totalCount - excludedCount;

  // Filter subject chips if search query is provided
  const filteredSubjects = useMemo(() => {
    const q = subSearch.trim().toLowerCase();
    if (!q) return availableSubjects;
    return availableSubjects.filter(
      (s) => s.code.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q))
    );
  }, [availableSubjects, subSearch]);

  const COLLAPSED_LIMIT = 14;
  const showExpandButton = !subSearch && availableSubjects.length > COLLAPSED_LIMIT;
  const displayedSubjects = showExpandButton && !isExpanded
    ? filteredSubjects.slice(0, COLLAPSED_LIMIT)
    : filteredSubjects;

  return (
    <div style={{
      padding: '14px 16px',
      borderTop: '1px solid var(--border)',
      background: 'var(--bg-card)',
    }}>
      {/* Subject Filter Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '10px', marginBottom: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <SlidersHorizontal size={14} style={{ color: 'var(--green)' }} />
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Consider Subject Attendance
            </span>
          </div>
          <span style={{
            fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '999px',
            background: excludedCount > 0 ? 'rgba(245,158,11,0.1)' : 'rgba(34,197,94,0.1)',
            color: excludedCount > 0 ? '#d97706' : 'var(--green)',
            border: `1px solid ${excludedCount > 0 ? 'rgba(245,158,11,0.25)' : 'rgba(34,197,94,0.2)'}`,
          }}>
            {consideredCount} of {totalCount} considered
          </span>
          {excludedCount > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: 600, color: '#ef4444',
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}>
              <AlertTriangle size={11} /> {excludedCount} excluded from evaluation
            </span>
          )}
        </div>

        {/* Quick action controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {totalCount > 10 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '4px 8px', borderRadius: '6px', background: 'var(--bg-hover)',
              border: '1px solid var(--border)', fontSize: '12px',
            }}>
              <Search size={11} style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Find subject code..."
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                style={{
                  border: 'none', background: 'transparent', outline: 'none',
                  fontSize: '11px', color: 'var(--text-primary)', width: '120px',
                }}
              />
              {subSearch && (
                <button
                  onClick={() => setSubSearch('')}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, color: 'var(--text-muted)', display: 'flex' }}
                >
                  <X size={10} />
                </button>
              )}
            </div>
          )}

          <button
            onClick={onSelectAll}
            title="Consider all subjects in attendance evaluation"
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: excludedCount === 0 ? 'rgba(34,197,94,0.1)' : 'var(--bg-hover)',
              color: excludedCount === 0 ? 'var(--green)' : 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            Select All
          </button>

          <button
            onClick={onDeselectAll}
            title="Exclude all subjects"
            style={{
              padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', border: '1px solid var(--border)',
              background: 'var(--bg-hover)', color: 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            Deselect All
          </button>

          {excludedCount > 0 && (
            <button
              onClick={onSelectAll}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
                cursor: 'pointer', border: '1px solid rgba(34,197,94,0.3)',
                background: 'rgba(34,197,94,0.12)', color: 'var(--green)',
                transition: 'all 0.15s ease',
              }}
            >
              <RotateCcw size={10} /> Reset (Include All)
            </button>
          )}
        </div>
      </div>

      {/* Subject Chips Grid */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {displayedSubjects.map((sub) => {
          const isSelected = !deselectedSubjects.has(sub.code);
          return (
            <button
              key={sub.code}
              onClick={() => onToggleSubject(sub.code)}
              title={sub.name ? `${sub.code} — ${sub.name} (Click to ${isSelected ? 'deselect / ignore' : 'select / consider'})` : `Click to ${isSelected ? 'deselect / ignore' : 'select / consider'}`}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                border: isSelected
                  ? '1px solid rgba(34,197,94,0.35)'
                  : '1px dashed var(--border-strong)',
                background: isSelected
                  ? 'rgba(34,197,94,0.08)'
                  : 'var(--bg-hover)',
                color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                opacity: isSelected ? 1 : 0.65,
                transition: 'all 0.15s ease',
              }}
            >
              {isSelected ? (
                <div style={{
                  width: '14px', height: '14px', borderRadius: '4px',
                  background: 'var(--green)', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0,
                }}>
                  <Check size={10} color="#fff" strokeWidth={3} />
                </div>
              ) : (
                <div style={{
                  width: '14px', height: '14px', borderRadius: '4px',
                  border: '1px solid var(--border-strong)', background: 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <X size={9} style={{ color: 'var(--text-muted)' }} />
                </div>
              )}

              <span style={{
                fontFamily: 'monospace', fontSize: '11px',
                textDecoration: isSelected ? 'none' : 'line-through',
              }}>
                {sub.code}
              </span>

              {/* Tag showing how many students have < 75% in this subject */}
              {sub.lowStudents > 0 && (
                <span style={{
                  padding: '1px 5px', borderRadius: '999px', fontSize: '10px', fontWeight: 700,
                  background: isSelected ? 'rgba(239,68,68,0.14)' : 'rgba(148,163,184,0.15)',
                  color: isSelected ? '#ef4444' : 'var(--text-muted)',
                  border: `1px solid ${isSelected ? 'rgba(239,68,68,0.25)' : 'transparent'}`,
                }}>
                  {sub.lowStudents} &lt; 75%
                </span>
              )}
            </button>
          );
        })}

        {showExpandButton && (
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '8px', cursor: 'pointer',
              fontSize: '11px', fontWeight: 600, border: '1px solid var(--border)',
              background: 'var(--bg-hover)', color: 'var(--text-secondary)',
            }}
          >
            {isExpanded ? (
              <>Show Less <ChevronUp size={12} /></>
            ) : (
              <>+{availableSubjects.length - COLLAPSED_LIMIT} more subjects <ChevronDown size={12} /></>
            )}
          </button>
        )}
      </div>

      {/* Exclusion notice banner if any excluded */}
      {excludedCount > 0 && (
        <div style={{
          marginTop: '10px', padding: '8px 12px', borderRadius: '8px',
          background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <AlertTriangle size={13} style={{ color: '#d97706', flexShrink: 0 }} />
            <span>
              Attendance in <strong>{Array.from(deselectedSubjects).join(', ')}</strong> is currently ignored. Students with low attendance only in {excludedCount === 1 ? 'this subject' : 'these subjects'} will not be flagged.
            </span>
          </div>
          <button
            onClick={onSelectAll}
            style={{
              background: 'none', border: 'none', color: 'var(--green)',
              cursor: 'pointer', fontWeight: 700, fontSize: '11px', padding: 0,
              textDecoration: 'underline',
            }}
          >
            Include all subjects
          </button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function Attendance() {
  const [files, setFiles] = useState([]); // [{ name, sheets }]
  const [activeIdx, setActiveIdx] = useState(null);
  const [filterLow, setFilterLow] = useState(false);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState([]);
  const [deselectedSubjects, setDeselectedSubjects] = useState(() => new Set());

  const handleFiles = useCallback(async (incoming) => {
    const added = [];
    const errs = [];
    for (const f of incoming) {
      if (files.some((x) => x.name === f.name)) continue;
      try {
        const buf = await f.arrayBuffer();
        const wb = XLSX.read(buf, { type: 'array' });
        const sheets = parseWorkbook(wb);
        if (sheets.length === 0) {
          errs.push(`"${f.name}" — No recognisable attendance data found (checked for both formats).`);
        } else {
          added.push({ name: f.name, size: f.size, sheets });
        }
      } catch (e) {
        errs.push(`"${f.name}" — Failed to read: ${e.message}`);
      }
    }
    if (added.length) {
      setFiles((prev) => {
        const next = [...prev, ...added];
        setActiveIdx(next.length - 1);
        return next;
      });
    }
    if (errs.length) setErrors((prev) => [...prev, ...errs]);
  }, [files]);

  const removeFile = (idx) => {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      setActiveIdx(next.length > 0 ? Math.min(idx, next.length - 1) : null);
      return next;
    });
  };

  const activeFile = activeIdx !== null ? files[activeIdx] : null;

  // Extract all unique subject codes from active file
  const availableSubjects = useMemo(() => {
    if (!activeFile) return [];
    const map = new Map();
    activeFile.sheets.forEach((sheet) => {
      sheet.students.forEach((st) => {
        (st.subjects || []).forEach((sub) => {
          const norm = normalizeSubjectCode(sub.code);
          if (!norm) return;
          if (!map.has(norm)) {
            map.set(norm, {
              code: norm,
              rawCode: sub.code.split('(')[0].trim(),
              name: sub.name || '',
              totalStudents: 0,
              lowStudents: 0,
            });
          }
          const item = map.get(norm);
          if (!item.name && sub.name) item.name = sub.name;
          item.totalStudents += 1;
          if (sub.pct !== null && sub.pct < LOW) {
            item.lowStudents += 1;
          }
        });
      });
    });
    return Array.from(map.values()).sort((a, b) => {
      if (b.lowStudents !== a.lowStudents) return b.lowStudents - a.lowStudents;
      return a.code.localeCompare(b.code);
    });
  }, [activeFile]);

  const toggleSubject = (normCode) => {
    setDeselectedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(normCode)) {
        next.delete(normCode);
      } else {
        next.add(normCode);
      }
      return next;
    });
  };

  const selectAllSubjects = () => {
    setDeselectedSubjects(new Set());
  };

  const deselectAllSubjects = () => {
    setDeselectedSubjects(new Set(availableSubjects.map((s) => s.code)));
  };

  const totalStudents = activeFile ? activeFile.sheets.reduce((a, s) => a + s.students.length, 0) : 0;
  const totalLow = activeFile
    ? activeFile.sheets.reduce((a, s) => a + s.students.filter((st) => hasLowAttendance(st, deselectedSubjects)).length, 0)
    : 0;

  return (
    <div style={{ padding: '28px 28px 64px', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Page header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '5px' }}>
          <Users size={21} style={{ color: 'var(--green)' }} />
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>Attendance Records</h1>
        </div>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
          Upload monthly attendance sheets to view and filter student data. Both full-section and low-attendance report formats are supported.
        </p>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)',
          display: 'flex', alignItems: 'flex-start', gap: '10px',
        }}>
          <AlertTriangle size={15} style={{ color: '#ef4444', flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            {errors.map((e, i) => <div key={i} style={{ fontSize: '13px', color: '#ef4444' }}>{e}</div>)}
          </div>
          <button onClick={() => setErrors([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px', display: 'flex' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Drop zone */}
      <DropZone onFiles={handleFiles} />

      {/* File tabs */}
      {files.length > 0 && (
        <div style={{ marginTop: '18px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {files.map((f, idx) => (
            <button
              key={f.name}
              onClick={() => {
                setActiveIdx(idx);
                setDeselectedSubjects(new Set());
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '7px 12px', borderRadius: '10px', cursor: 'pointer',
                border: `2px solid ${activeIdx === idx ? 'var(--green)' : 'var(--border)'}`,
                background: activeIdx === idx ? 'rgba(34,197,94,0.06)' : 'var(--bg-card)',
                color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              <FileSpreadsheet size={14} style={{ color: activeIdx === idx ? 'var(--green)' : 'var(--text-muted)', flexShrink: 0 }} />
              <span style={{ maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({(f.size / 1024).toFixed(0)}KB)</span>
              <span
                onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
                style={{ marginLeft: '2px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Remove"
              >
                <X size={13} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Controls + data */}
      {activeFile && (
        <div style={{ marginTop: '24px' }}>
          {/* Controls & Filter Panel */}
          <div style={{
            marginBottom: '20px', background: 'var(--bg-card)',
            borderRadius: '12px', border: '1px solid var(--border)',
            overflow: 'hidden',
          }}>
            {/* Main Controls row: Search, Below 75% filter toggle, Stats */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap',
              padding: '10px 14px',
            }}>
              {/* Search */}
              <div style={{
                flex: 1, minWidth: '180px', display: 'flex', alignItems: 'center', gap: '8px',
                background: 'var(--bg-hover)', borderRadius: '8px', padding: '7px 12px',
                border: '1px solid var(--border)',
              }}>
                <Search size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <input
                  type="text" placeholder="Search name or reg no..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--text-primary)', fontSize: '13px', width: '100%' }}
                />
                {search && (
                  <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}>
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Low attendance filter toggle */}
              <button
                onClick={() => setFilterLow((v) => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '7px',
                  padding: '7px 14px', borderRadius: '8px', cursor: 'pointer',
                  border: `1px solid ${filterLow ? '#ef4444' : 'var(--border)'}`,
                  background: filterLow ? 'rgba(239,68,68,0.1)' : 'var(--bg-hover)',
                  color: filterLow ? '#ef4444' : 'var(--text-secondary)',
                  fontWeight: 600, fontSize: '13px', transition: 'all 0.15s',
                }}
              >
                <AlertTriangle size={14} />
                {filterLow ? 'Showing: below 75% only' : 'Filter: below 75%'}
                {filterLow && totalLow > 0 && (
                  <span style={{
                    padding: '1px 7px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                    background: 'rgba(239,68,68,0.2)', color: '#ef4444',
                  }}>{totalLow}</span>
                )}
              </button>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '16px', marginLeft: 'auto', flexShrink: 0 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{totalStudents}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Students</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: totalLow > 0 ? '#ef4444' : 'var(--text-primary)' }}>{totalLow}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Below 75%</div>
                </div>
              </div>
            </div>

            {/* Subject Code Selection Filter */}
            {availableSubjects.length > 0 && (
              <SubjectFilterSection
                availableSubjects={availableSubjects}
                deselectedSubjects={deselectedSubjects}
                onToggleSubject={toggleSubject}
                onSelectAll={selectAllSubjects}
                onDeselectAll={deselectAllSubjects}
              />
            )}
          </div>

          {/* Sheets */}
          {activeFile.sheets.map((sheet, idx) => (
            <SheetDisplay
              key={idx}
              sheet={sheet}
              filterLow={filterLow}
              searchQuery={search}
              deselectedSubjects={deselectedSubjects}
            />
          ))}
        </div>
      )}

      {files.length === 0 && (
        <div style={{ marginTop: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          <FileSpreadsheet size={36} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
          <p style={{ margin: 0 }}>Upload an Excel attendance sheet above to get started.</p>
        </div>
      )}
    </div>
  );
}
