import { NextRequest, NextResponse } from 'next/server';

/**
 * YouTube oEmbed API 代理路由
 * 解决客户端直接调用 YouTube API 可能遇到的 CORS 问题
 *
 * 用法:
 * GET /api/proxy/youtube?videoId=dQw4w9WgXcQ
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const videoId = searchParams.get('videoId');

  if (!videoId) {
    return NextResponse.json(
      { error: 'Missing videoId parameter' },
      { status: 400 }
    );
  }

  try {
    //const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    // --- 修改开始 ---
    // 1. 获取环境变量中的代理地址，如果没有设置则默认使用官方地址
    // 注意：Vercel/Node.js 环境变量在 process.env 下
    const proxyHost = process.env.YOUTUBE_PROXY || 'https://www.youtube.com';
    
    // 2. 构建请求 URL，指向你的代理或官方
    // 如果 proxyHost 是 cf.你的域名，它会请求 cf.你的域名/oembed...
    const apiUrl = `${proxyHost}/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    // --- 修改结束 ---

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'LunaTV/1.0 (https://github.com/ap01082/LunaTV)',
        'Accept': 'application/json',
      },
      next: {
        // 缓存1小时（视频信息不常变）
        revalidate: 3600,
      },
    });

    if (!response.ok) {
      // YouTube oEmbed 对无效视频返回 404
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Video not found or unavailable' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `YouTube API returned ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // 返回数据，并设置缓存头
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (error) {
    console.error('YouTube API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from YouTube API' },
      { status: 500 }
    );
  }
}
