interface OpenGraphData {
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
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
      throw new Error('Failed to fetch');
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
    
    return ogData;
  } catch (error) {
    console.error('Failed to fetch Open Graph data:', error);
    return {};
  }
}
