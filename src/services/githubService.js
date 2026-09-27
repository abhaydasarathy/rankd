import { supabase, isSupabaseConfigured } from "../lib/supabaseClient.js";

/**
 * Fetch GitHub user statistics with Edge Function primary and public REST fallback
 */
export async function fetchGitHubStats(username) {
  if (!username || !username.trim()) {
    throw new Error("GitHub username is required");
  }

  const cleanUser = username
    .trim()
    .replace(/^https?:\/\/(www\.)?github\.com\//i, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .trim();

  if (!cleanUser) {
    throw new Error("Invalid GitHub username or URL");
  }

  // 1. Try Supabase Edge Function
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase.functions.invoke("fetch-github-profile", {
        body: { username: cleanUser },
      });

      if (!error && data && !data.error) {
        return {
          username: data.username || cleanUser,
          profileUrl: data.profileUrl || `https://github.com/${cleanUser}`,
          reposLastYear: Number(data.reposLastYear || 0),
          totalContributions: Number(data.totalContributions || 0),
          activeMonthsCount: Number(data.activeMonthsCount || 0),
          avgMonthlyFrequency: Number(data.avgMonthlyFrequency || 0),
          fetchedAt: data.fetchedAt || new Date().toISOString(),
          provider: "Edge Function",
        };
      }
    } catch (edgeErr) {
      console.warn("Notice: Edge function fetch-github-profile fallback to REST:", edgeErr);
    }
  }

  // 2. Resilient Public GitHub REST API Fallback
  try {
    const userResp = await fetch(`https://api.github.com/users/${cleanUser}`, {
      headers: { Accept: "application/vnd.github.v3+json" },
    });

    if (userResp.status === 404) {
      throw new Error(`GitHub user "${cleanUser}" not found. Check the username and try again.`);
    }

    if (!userResp.ok) {
      throw new Error(`GitHub API returned status ${userResp.status}`);
    }

    const userData = await userResp.json();
    const reposResp = await fetch(
      `https://api.github.com/users/${cleanUser}/repos?per_page=100&sort=created&direction=desc`,
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );

    let reposLastYear = 0;
    const monthsWithActivity = new Set();
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);

    if (reposResp.ok) {
      const repos = await reposResp.json();
      if (Array.isArray(repos)) {
        repos.forEach((repo) => {
          const createdAt = new Date(repo.created_at);
          const updatedAt = new Date(repo.updated_at);
          if (createdAt >= oneYearAgo) {
            reposLastYear += 1;
            monthsWithActivity.add(repo.created_at.slice(0, 7));
          }
          if (updatedAt >= oneYearAgo) {
            monthsWithActivity.add(repo.updated_at.slice(0, 7));
          }
        });
      }
    }

    const activeMonthsCount = Math.max(1, monthsWithActivity.size);
    const avgMonthlyFrequency = Math.round((activeMonthsCount / 12) * 10) / 10;
    const totalContributions = Math.max(reposLastYear * 4, userData.public_repos || 0);

    return {
      username: userData.login,
      profileUrl: userData.html_url,
      reposLastYear,
      totalContributions,
      activeMonthsCount,
      avgMonthlyFrequency,
      fetchedAt: new Date().toISOString(),
      provider: "Public REST",
    };
  } catch (restErr) {
    throw new Error(restErr.message || "Failed to fetch GitHub profile.");
  }
}
