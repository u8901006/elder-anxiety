#!/usr/bin/env node

const https = require("https");
const fs = require("fs");
const path = require("path");

const PUBMED_SEARCH =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_FETCH =
  "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi";

const JOURNALS = [
  '"Am J Geriatr Psychiatry"[jour]',
  '"Int Psychogeriatr"[jour]',
  '"Int J Geriatr Psychiatry"[jour]',
  '"Aging Ment Health"[jour]',
  '"J Geriatr Psychiatry Neurol"[jour]',
  '"Psychogeriatrics"[jour]',
  '"Clin Gerontol"[jour]',
  '"Gerontol Geriatr Med"[jour]',
  '"J Am Geriatr Soc"[jour]',
  '"Age Ageing"[jour]',
  '"BMC Geriatr"[jour]',
  '"Geriatr Gerontol Int"[jour]',
  '"Eur Geriatr Med"[jour]',
  '"Arch Gerontol Geriatr"[jour]',
  '"Gerontology"[jour]',
  '"Aging Clin Exp Res"[jour]',
  '"Clin Interv Aging"[jour]',
  '"J Gerontol A Biol Sci Med Sci"[jour]',
  '"J Gerontol B Psychol Sci Soc Sci"[jour]',
  '"Gerontologist"[jour]',
  '"Am J Psychiatry"[jour]',
  '"JAMA Psychiatry"[jour]',
  '"Lancet Psychiatry"[jour]',
  '"World Psychiatry"[jour]',
  '"Br J Psychiatry"[jour]',
  '"Psychiatry Res"[jour]',
  '"J Psychiatr Res"[jour]',
  '"J Clin Psychiatry"[jour]',
  '"BMC Psychiatry"[jour]',
  '"Front Psychiatry"[jour]',
  '"Soc Psychiatry Psychiatr Epidemiol"[jour]',
  '"Psychol Med"[jour]',
  '"J Anxiety Disord"[jour]',
  '"Behav Res Ther"[jour]',
  '"Behav Ther"[jour]',
  '"J Consult Clin Psychol"[jour]',
  '"Clin Psychol Rev"[jour]',
  '"Psychol Assess"[jour]',
  '"Assessment"[jour]',
  '"Psychol Aging"[jour]',
  '"Biol Psychiatry"[jour]',
  '"Neuroimage Clin"[jour]',
  '"Neurobiol Aging"[jour]',
  '"Psychoneuroendocrinology"[jour]',
  '"Brain Behav Immun"[jour]',
  '"Psychophysiology"[jour]',
  '"Front Aging Neurosci"[jour]',
  '"Brain Stimul"[jour]',
  '"Mol Psychiatry"[jour]',
  '"Transl Psychiatry"[jour]',
  '"J Affect Disord"[jour]',
  '"Soc Sci Med"[jour]',
  '"BMC Public Health"[jour]',
  '"Community Ment Health J"[jour]',
  '"Int J Soc Psychiatry"[jour]',
  '"Transcult Psychiatry"[jour]',
  '"J Gerontol Soc Work"[jour]',
  '"Geriatr Nurs"[jour]',
  '"J Gerontol Nurs"[jour]',
  '"Int J Nurs Stud"[jour]',
  '"J Am Med Dir Assoc"[jour]',
  '"Pain"[jour]',
  '"Sleep"[jour]',
  '"J Clin Sleep Med"[jour]',
  '"Mov Disord"[jour]',
  '"Stroke"[jour]',
  '"Neurology"[jour]',
  '"Alzheimers Dement"[jour]',
];

const ANXIETY_TERMS =
  '("Anxiety Disorders"[Mesh] OR "Anxiety"[Mesh] OR anxi*[tiab] OR "generalized anxiety disorder"[tiab] OR GAD[tiab] OR "panic disorder"[tiab] OR agorophobi*[tiab] OR phobi*[tiab] OR "social anxiety"[tiab] OR "health anxiety"[tiab] OR "fear of falling"[tiab] OR worry[tiab] OR "death anxiety"[tiab] OR "illness anxiety"[tiab])';

const POPULATION_TERMS =
  '("Aged"[Mesh] OR "Aged, 80 and over"[Mesh] OR elder*[tiab] OR "older adult*"[tiab] OR "older people"[tiab] OR geriatric*[tiab] OR "late life"[tiab] OR "late-life"[tiab] OR "oldest old"[tiab])';

const HEADERS = { "User-Agent": "ElderAnxietyBot/1.0 (research aggregator)" };

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: HEADERS, timeout: 30000 }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const postData = body;
    const options = {
      hostname: u.hostname,
      path: u.pathname + u.search,
      method: "POST",
      headers: {
        ...HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
      timeout: 60000,
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });
    req.write(postData);
    req.end();
  });
}

function buildQueries(days) {
  const now = new Date();
  const lookback = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const dateStr = `${lookback.getFullYear()}/${String(
    lookback.getMonth() + 1
  ).padStart(2, "0")}/${String(lookback.getDate()).padStart(2, "0")}`;
  const datePart = `"${dateStr}"[Date - Publication] : "3000"[Date - Publication]`;
  const baseQuery = `${ANXIETY_TERMS} AND ${POPULATION_TERMS} AND ${datePart}`;

  const journalBuckets = [];
  const bucketSize = 8;
  for (let i = 0; i < JOURNALS.length; i += bucketSize) {
    const bucket = JOURNALS.slice(i, i + bucketSize);
    journalBuckets.push(bucket);
  }

  const queries = [];

  queries.push(baseQuery);

  for (const bucket of journalBuckets) {
    const journalPart = bucket.join(" OR ");
    queries.push(
      `(${ANXIETY_TERMS}) AND (${POPULATION_TERMS}) AND (${journalPart}) AND ${datePart}`
    );
  }

  return queries;
}

async function searchPapers(query, retmax = 40) {
  const params = new URLSearchParams({
    db: "pubmed",
    term: query,
    retmax: String(retmax),
    sort: "date",
    retmode: "json",
  });
  const url = `${PUBMED_SEARCH}?${params.toString()}`;
  try {
    const data = await httpsGet(url);
    const json = JSON.parse(data);
    return json?.esearchresult?.idlist || [];
  } catch (e) {
    console.error(`[ERROR] PubMed search failed: ${e.message}`);
    return [];
  }
}

async function fetchDetails(pmids) {
  if (!pmids.length) return [];
  const ids = pmids.join(",");
  const params = `db=pubmed&id=${ids}&retmode=xml`;
  try {
    const xmlData = await httpsPost(PUBMED_FETCH, params);
    return parseXml(xmlData);
  } catch (e) {
    console.error(`[ERROR] PubMed fetch failed: ${e.message}`);
    return [];
  }
}

function parseXml(xml) {
  const papers = [];
  const articleRegex =
    /<PubmedArticle>([\s\S]*?)<\/PubmedArticle>/g;
  let match;
  while ((match = articleRegex.exec(xml)) !== null) {
    const block = match[1];

    const titleMatch = block.match(
      /<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/
    );
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";

    const abstractParts = [];
    const absRegex =
      /<AbstractText[^>]*Label="([^"]*)"[^>]*>([\s\S]*?)<\/AbstractText>/g;
    let absMatch;
    while ((absMatch = absRegex.exec(block)) !== null) {
      const label = absMatch[1];
      const text = absMatch[2].replace(/<[^>]+>/g, "").trim();
      if (text) abstractParts.push(label ? `${label}: ${text}` : text);
    }
    if (abstractParts.length === 0) {
      const plainAbsMatch = block.match(
        /<AbstractText>([\s\S]*?)<\/AbstractText>/
      );
      if (plainAbsMatch) {
        abstractParts.push(plainAbsMatch[1].replace(/<[^>]+>/g, "").trim());
      }
    }
    const abstract = abstractParts.join(" ").slice(0, 2000);

    const journalMatch = block.match(/<Title>([\s\S]*?)<\/Title>/);
    const journal = journalMatch ? journalMatch[1].trim() : "";

    const yearMatch = block.match(/<Year>(\d{4})<\/Year>/);
    const monthMatch = block.match(/<Month>([\s\S]*?)<\/Month>/);
    const dayMatch = block.match(/<Day>(\d+)<\/Day>/);
    const dateParts = [
      yearMatch?.[1],
      monthMatch?.[1],
      dayMatch?.[1],
    ].filter(Boolean);
    const dateStr = dateParts.join(" ");

    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    const pmid = pmidMatch ? pmidMatch[1] : "";
    const url = pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "";

    const keywords = [];
    const kwRegex = /<Keyword>([\s\S]*?)<\/Keyword>/g;
    let kwMatch;
    while ((kwMatch = kwRegex.exec(block)) !== null) {
      if (kwMatch[1].trim()) keywords.push(kwMatch[1].trim());
    }

    papers.push({
      pmid,
      title,
      journal,
      date: dateStr,
      abstract,
      url,
      keywords,
    });
  }
  return papers;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const opts = { days: 7, maxPapers: 40, output: "papers.json" };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--days" && args[i + 1]) opts.days = parseInt(args[++i]);
    if (args[i] === "--max-papers" && args[i + 1])
      opts.maxPapers = parseInt(args[++i]);
    if (args[i] === "--output" && args[i + 1]) opts.output = args[++i];
  }
  return opts;
}

async function main() {
  const opts = parseArgs();
  console.error(
    `[INFO] Searching PubMed for late-life anxiety papers from last ${opts.days} days...`
  );

  const queries = buildQueries(opts.days);
  const allPmids = new Set();

  for (const query of queries) {
    try {
      const pmids = await searchPapers(query, opts.maxPapers);
      pmids.forEach((id) => allPmids.add(id));
    } catch (e) {
      console.error(`[WARN] Query failed, continuing: ${e.message}`);
    }
  }

  const uniquePmids = [...allPmids].slice(0, opts.maxPapers);
  console.error(
    `[INFO] Found ${allPmids.size} unique PMIDs, fetching top ${uniquePmids.length}`
  );

  let papers = [];
  if (uniquePmids.length > 0) {
    for (let i = 0; i < uniquePmids.length; i += 50) {
      const batch = uniquePmids.slice(i, i + 50);
      const batchPapers = await fetchDetails(batch);
      papers = papers.concat(batchPapers);
    }
  }

  console.error(`[INFO] Fetched details for ${papers.length} papers`);

  const tzOffset = 8 * 60;
  const now = new Date(
    Date.now() + tzOffset * 60 * 1000 + new Date().getTimezoneOffset() * 60000
  );
  const dateStr = now.toISOString().slice(0, 10);

  const output = {
    date: dateStr,
    count: papers.length,
    papers,
  };

  const jsonStr = JSON.stringify(output, null, 2);
  fs.writeFileSync(opts.output, jsonStr, "utf-8");
  console.error(`[INFO] Saved to ${opts.output}`);
}

main().catch((e) => {
  console.error(`[FATAL] ${e.message}`);
  process.exit(1);
});
