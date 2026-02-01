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
    
    // 5초 타임아웃 설정
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
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
    
    // Open Graph 메타 태그 파싱 (더 강력한 파싱)
    const ogData: OpenGraphData = {};
    
    // Helper function: 다양한 메타 태그 형식 지원
    const getMetaContent = (property: string): string | undefined => {
      // 패턴 1: property="og:xxx" content="yyy"
      let match = html.match(new RegExp(`<meta[^>]*property=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
      if (match) return match[1];
      
      // 패턴 2: content="yyy" property="og:xxx" (순서 반대)
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*property=["']${property}["']`, 'i'));
      if (match) return match[1];
      
      // 패턴 3: name="og:xxx" content="yyy" (일부 사이트는 name 사용)
      match = html.match(new RegExp(`<meta[^>]*name=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i'));
      if (match) return match[1];
      
      // 패턴 4: content="yyy" name="og:xxx"
      match = html.match(new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*name=["']${property}["']`, 'i'));
      if (match) return match[1];
      
      return undefined;
    };
    
    // og:title
    ogData.title = getMetaContent('og:title');
    
    // og:description
    ogData.description = getMetaContent('og:description');
    
    // og:image (상대 URL을 절대 URL로 변환)
    const imageUrl = getMetaContent('og:image');
    if (imageUrl) {
      try {
        // 이미 절대 URL이면 그대로, 상대 URL이면 절대 URL로 변환
        if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
          ogData.image = imageUrl;
        } else if (imageUrl.startsWith('//')) {
          // Protocol-relative URL (예: //example.com/image.jpg)
          ogData.image = `https:${imageUrl}`;
        } else if (imageUrl.startsWith('/')) {
          // 절대 경로 (예: /images/og.jpg)
          const urlObj = new URL(url);
          ogData.image = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        } else {
          // 상대 경로 (예: images/og.jpg)
          const urlObj = new URL(url);
          const basePath = urlObj.pathname.substring(0, urlObj.pathname.lastIndexOf('/') + 1);
          ogData.image = `${urlObj.protocol}//${urlObj.host}${basePath}${imageUrl}`;
        }
      } catch (e) {
        console.warn('Failed to parse image URL:', imageUrl);
        ogData.image = imageUrl; // 파싱 실패 시 원본 사용
      }
    }
    
    // og:site_name
    ogData.siteName = getMetaContent('og:site_name');
    
    // fallback: <title> 태그
    if (!ogData.title) {
      const pageTitleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (pageTitleMatch) {
        ogData.title = pageTitleMatch[1].trim();
      }
    }
    
    // 로그로 파싱 결과 확인 (디버깅용)
    console.log('📊 OG Data parsed:', {
      url,
      title: ogData.title ? '✅' : '❌',
      description: ogData.description ? '✅' : '❌',
      image: ogData.image ? '✅' : '❌',
      siteName: ogData.siteName ? '✅' : '❌',
    });
    
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
