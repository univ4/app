/**
 * GitHub Release 자산 다운로드.
 *
 * 비공개 저장소: `browser_download_url`(github.com)은 토큰으로도 404가 나는 경우가 있어,
 * api.github.com + asset id + `Accept: application/octet-stream` 경로를 사용한다.
 *
 * 공개 URL 직접 GET(레거시): `fetchGithubReleaseOk` / `githubReleaseFetchInit`
 *
 * 환경변수: `GITHUB_TOKEN` (비공개 Release·rate limit 완화 시 Bearer 로 전달)
 */

const DEFAULT_ACCEPT = "application/json, application/x-ndjson, */*";
const GITHUB_API = "https://api.github.com";
const ACCEPT_GITHUB_JSON = "application/vnd.github+json";

function bearerHeaders(
  accept: string,
): Record<string, string> {
  const headers: Record<string, string> = { Accept: accept };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return "";
  }
}

export function githubReleaseFetchInit(
  accept: string = DEFAULT_ACCEPT,
): RequestInit {
  const token = process.env.GITHUB_TOKEN?.trim();
  const headers: Record<string, string> = { Accept: accept };
  if (token) {
    headers.Authorization = `token ${token}`;
  }
  return { redirect: "follow", headers };
}

export async function fetchGithubReleaseOk(url: string): Promise<Response> {
  const res = await fetch(url, githubReleaseFetchInit());
  if (!res.ok) {
    throw new Error(`GET 실패 ${res.status} ${res.statusText}: ${url}`);
  }
  return res;
}

export type GithubReleaseAsset = { id: number; name: string };

function parseReleaseAssets(data: unknown): GithubReleaseAsset[] {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return [];
  }
  const assets = (data as Record<string, unknown>).assets;
  if (!Array.isArray(assets)) return [];
  const out: GithubReleaseAsset[] = [];
  for (const a of assets) {
    if (!a || typeof a !== "object") continue;
    const o = a as Record<string, unknown>;
    const id = o.id;
    const name = o.name;
    if (typeof id === "number" && Number.isFinite(id) && typeof name === "string") {
      out.push({ id, name });
    }
  }
  return out;
}

async function fetchGithubReleaseJson(repo: string, tag: string): Promise<unknown> {
  const repoSeg = repo.trim();
  if (!repoSeg || !/^[\w.-]+\/[\w.-]+$/.test(repoSeg)) {
    throw new Error(
      `fetchGithubReleaseJson: repo 형식이 올바르지 않습니다: ${JSON.stringify(repo)}`,
    );
  }
  const tagEnc = encodeURIComponent(tag);
  const releaseUrl = `${GITHUB_API}/repos/${repoSeg}/releases/tags/${tagEnc}`;
  const releaseRes = await fetch(releaseUrl, {
    redirect: "follow",
    headers: bearerHeaders(ACCEPT_GITHUB_JSON),
  });
  if (!releaseRes.ok) {
    const hint = await readErrorBody(releaseRes);
    throw new Error(
      `GitHub Release 메타 GET 실패 ${releaseRes.status} ${releaseRes.statusText}: ${releaseUrl}${hint ? ` | ${hint}` : ""}`,
    );
  }
  try {
    return await releaseRes.json();
  } catch (e) {
    throw new Error(
      `GitHub Release JSON 파싱 실패: ${e instanceof Error ? e.message : e}`,
    );
  }
}

/** Release 태그에 연결된 자산 id·파일명 목록 */
export async function listGithubReleaseAssets(
  repo: string,
  tag: string,
): Promise<GithubReleaseAsset[]> {
  const releaseJson = await fetchGithubReleaseJson(repo, tag);
  return parseReleaseAssets(releaseJson);
}

/**
 * GitHub Releases API로 태그별 자산 바이너리를 받는다.
 * 1) GET /repos/{repo}/releases/tags/{tag} (Accept: application/vnd.github+json)
 * 2) assets 에서 name === filename 인 id
 * 3) GET /repos/{repo}/releases/assets/{id} (Accept: application/octet-stream)
 */
export async function fetchGithubReleaseAsset(
  repo: string,
  tag: string,
  filename: string,
): Promise<Response> {
  const repoSeg = repo.trim();
  if (!repoSeg || !/^[\w.-]+\/[\w.-]+$/.test(repoSeg)) {
    throw new Error(`fetchGithubReleaseAsset: repo 형식이 올바르지 않습니다: ${JSON.stringify(repo)}`);
  }
  const assets = await listGithubReleaseAssets(repoSeg, tag);
  const asset = assets.find((a) => a.name === filename);
  if (!asset) {
    const names = assets.map((a) => a.name).join(", ");
    throw new Error(
      `Release 자산 없음: tag=${tag} filename=${JSON.stringify(filename)} (보유: ${names || "(없음)"})`,
    );
  }
  return fetchGithubReleaseBinary(repoSeg, asset);
}

/** 이미 조회한 `GithubReleaseAsset`으로 바이너리만 받는다 (Release 메타 중복 GET 방지). */
export async function fetchGithubReleaseBinary(
  repo: string,
  asset: GithubReleaseAsset,
): Promise<Response> {
  const repoSeg = repo.trim();
  const assetUrl = `${GITHUB_API}/repos/${repoSeg}/releases/assets/${asset.id}`;
  const binaryRes = await fetch(assetUrl, {
    redirect: "follow",
    headers: bearerHeaders("application/octet-stream"),
  });
  if (!binaryRes.ok) {
    const hint = await readErrorBody(binaryRes);
    throw new Error(
      `GitHub Release 자산 GET 실패 ${binaryRes.status} ${binaryRes.statusText}: ${assetUrl}${hint ? ` | ${hint}` : ""}`,
    );
  }
  return binaryRes;
}
