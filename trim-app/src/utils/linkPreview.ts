interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  favicon?: string;
}

// URL에서 기본 제목 생성 (fallback)
function getTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname;
    
    // 경로가 있으면 마지막 세그먼트 사용
    if (path && path !== '/') {
      const segments = path.split('/').filter(s => s.length > 0);
      if (segments.length > 0) {
        const lastSegment = segments[segments.length - 1];
        // index.xxx 같은 경우 무시하고 도메인 사용
        if (/^index\b/i.test(lastSegment)) {
          return domain;
        }
        // 파일 확장자 제거, 하이픈/언더스코어를 공백으로
        const title = lastSegment
          .replace(/\.[^.]+$/, '')
          .replace(/[-_]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        return title;
      }
    }
    
    // 경로 없으면 도메인 사용
    return domain;
  } catch {
    return url;
  }
}

// 도메인 추출
function getDomainFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return url;
  }
}

// Google Favicon API를 통한 favicon URL 생성 (가장 안정적)
function getGoogleFaviconUrl(url: string): string {
  try {
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return '';
  }
}

// HTML에서 favicon URL 추출 시도
function extractFaviconFromHtml(html: string, baseUrl: string): string | undefined {
  // <link rel="icon" href="..."> 또는 <link rel="shortcut icon" href="...">
  const faviconPatterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["']apple-touch-icon["']/i,
  ];

  for (const pattern of faviconPatterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      return normalizeUrl(match[1], baseUrl);
    }
  }
  return undefined;
}

// 상대 URL을 절대 URL로 변환
function normalizeUrl(rawUrl: string, baseUrl: string): string {
  if (!rawUrl) return rawUrl;
  try {
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    } else if (rawUrl.startsWith('//')) {
      return `https:${rawUrl}`;
    } else if (rawUrl.startsWith('/')) {
      const urlObj = new URL(baseUrl);
      return `${urlObj.protocol}//${urlObj.host}${rawUrl}`;
    } else {
      const urlObj = new URL(baseUrl);
      const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
      return `${urlObj.protocol}//${urlObj.host}${basePath}${rawUrl}`;
    }
  } catch {
    return rawUrl;
  }
}

// HTML에서 메타 태그 content 추출 (다양한 형식 지원)
function getMetaContent(html: string, property: string): string | undefined {
  // 패턴 1: property="xxx" content="yyy"
  let match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (match) return match[1];
  
  // 패턴 2: content="yyy" property="xxx"
  match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
  if (match) return match[1];
  
  // 패턴 3: name="xxx" content="yyy"
  match = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
  if (match) return match[1];
  
  // 패턴 4: content="yyy" name="xxx"
  match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
  if (match) return match[1];
  
  return undefined;
}

// HTML에서 OG 데이터 파싱
function parseOgDataFromHtml(html: string, url: string): OpenGraphData {
  const ogData: OpenGraphData = {};

  // Title 우선순위: og:title > twitter:title > <title>
  ogData.title = getMetaContent(html, 'og:title')
    || getMetaContent(html, 'twitter:title')
    || undefined;
  
  if (!ogData.title) {
    const pageTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (pageTitleMatch) {
      ogData.title = pageTitleMatch[1].trim();
    }
  }
  
  // Description 우선순위: og:description > twitter:description > meta description
  ogData.description = getMetaContent(html, 'og:description')
    || getMetaContent(html, 'twitter:description')
    || getMetaContent(html, 'description')
    || undefined;
  
  // Image 우선순위: og:image > twitter:image > twitter:image:src
  const rawImageUrl = getMetaContent(html, 'og:image')
    || getMetaContent(html, 'twitter:image')
    || getMetaContent(html, 'twitter:image:src')
    || undefined;
  
  ogData.image = rawImageUrl ? normalizeUrl(rawImageUrl, url) : undefined;
  
  // Site Name 우선순위: og:site_name > twitter:site > application-name
  ogData.siteName = getMetaContent(html, 'og:site_name')
    || getMetaContent(html, 'twitter:site')?.replace('@', '')
    || getMetaContent(html, 'application-name')
    || undefined;
  
  // Favicon: HTML에서 추출 시도, 실패 시 Google API 사용
  ogData.favicon = extractFaviconFromHtml(html, url) || getGoogleFaviconUrl(url);

  return ogData;
}

// CORS 프록시를 통해 HTML 가져오기 (다중 프록시 폴백)
async function fetchHtmlViaProxy(url: string): Promise<string | null> {
  const proxies = [
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
  ];

  for (const makeProxyUrl of proxies) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      
      const response = await fetch(makeProxyUrl(url), {
        signal: controller.signal,
        headers: { 'Accept': 'text/html' },
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const text = await response.text();
        // 유효한 HTML인지 최소 확인 (빈 응답 또는 에러 페이지 제외)
        if (text.length > 100 && (text.includes('<') || text.includes('meta'))) {
          return text;
        }
      }
    } catch {
      // 다음 프록시 시도
      continue;
    }
  }
  return null;
}

export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  const domain = getDomainFromUrl(url);
  const fallbackData: OpenGraphData = {
    title: getTitleFromUrl(url),
    siteName: domain,
    favicon: getGoogleFaviconUrl(url),
  };

  try {
    const html = await fetchHtmlViaProxy(url);
    
    if (!html) {
      console.warn('All proxies failed, using fallback');
      return fallbackData;
    }

    const ogData = parseOgDataFromHtml(html, url);
    
    // 로그로 파싱 결과 확인 (디버깅용)
    console.log('📊 OG Data parsed:', {
      url,
      title: ogData.title ? `✅ ${ogData.title.substring(0, 40)}` : '❌',
      description: ogData.description ? `✅ ${ogData.description.substring(0, 40)}` : '❌',
      image: ogData.image ? '✅' : '❌',
      siteName: ogData.siteName ? `✅ ${ogData.siteName}` : '❌',
      favicon: ogData.favicon ? '✅' : '❌',
    });
    
    // 최소한의 데이터 보장
    return {
      title: ogData.title || fallbackData.title,
      description: ogData.description,
      image: ogData.image,
      siteName: ogData.siteName || fallbackData.siteName,
      favicon: ogData.favicon || fallbackData.favicon,
    };
  } catch (error) {
    console.warn('Failed to fetch Open Graph data, using fallback:', error);
    return fallbackData;
  }
}
