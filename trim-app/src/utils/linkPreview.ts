interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
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

export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
  const fallbackData: OpenGraphData = {
    title: getTitleFromUrl(url),
    siteName: getDomainFromUrl(url),
  };

  try {
    // CORS를 우회하기 위해 프록시 사용
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    
    // 3초 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html',
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.warn('Failed to fetch OG data, using fallback');
      return fallbackData;
    }
    
    const html = await response.text();
    
    // Open Graph 메타 태그 파싱
    const ogData: OpenGraphData = {};
    
    // og:title
    const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']*)["']/i);
    if (titleMatch) {
      ogData.title = titleMatch[1];
    }
    
    // og:description
    const descMatch = html.match(/<meta\s+property=["']og:description["']\s+content=["']([^"']*)["']/i);
    if (descMatch) {
      ogData.description = descMatch[1];
    }
    
    // og:image
    const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']*)["']/i);
    if (imageMatch) {
      ogData.image = imageMatch[1];
    }
    
    // og:site_name
    const siteMatch = html.match(/<meta\s+property=["']og:site_name["']\s+content=["']([^"']*)["']/i);
    if (siteMatch) {
      ogData.siteName = siteMatch[1];
    }
    
    // fallback: <title> 태그
    if (!ogData.title) {
      const pageTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (pageTitleMatch) {
        ogData.title = pageTitleMatch[1].trim();
      }
    }
    
    // 최소한의 데이터 보장: title과 siteName은 항상 있어야 함
    return {
      title: ogData.title || fallbackData.title,
      description: ogData.description,
      image: ogData.image,
      siteName: ogData.siteName || fallbackData.siteName,
    };
  } catch (error) {
    console.warn('Failed to fetch Open Graph data, using fallback:', error);
    return fallbackData;
  }
}
