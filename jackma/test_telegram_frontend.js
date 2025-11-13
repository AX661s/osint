// 测试数据 - 模拟Telegram Complete API返回的结果
const mockTelegramResult = {
  "success": true,
  "source": "telegram_complete",
  "data": {
    "phone": "+14403828826",
    "telegram_found": true,
    "user_info": {
      "user_id": null,
      "username": "DoubleRJames", 
      "display_name": null,
      "first_name": null,
      "last_name": null,
      "bio": null,
      "last_seen": null,
      "status_type": null,
      "verified": false,
      "premium": false,
      "avatar_url": "https://cdn1.telesco.pe/file/a6gn2OpfVOhBTiuavPpzYhOJaIyo0I-aSiFNWTNk8WwsEEXgG_edwEuGSYCLA6jke7m74hXvNXn0xrXYWpXpf0yADsGB51RDJwAfqtCnt3yicj6JAr0ROMPzy5eQFuiGKYvhQFCnpT5B3-eI-Xac0LtfukfTBVIus5HwdeIjivGWk8QQpxeeqHWIqviZJwFqnVRqaTlbqil2AIJObwqAkWb8OOOfmvWz72b7fFRDLYcyqAFQCuGgz5TJxt-hvvEjFqhEIjvvq7viRqegp3Apq8tjIAwJfmJeVwsrMlM1yci5gapAI1a1tLQPubKS70e5KXxVneYtvVjt2zARrr8C9w.jpg",
      "avatar_url_hd": "https://cdn1.telesco.pe/file/a6gn2OpfVOhBTiuavPpzYhOJaIyo0I-aSiFNWTNk8WwsEEXgG_edwEuGSYCLA6jke7m74hXvNXn0xrXYWpXpf0yADsGB51RDJwAfqtCnt3yicj6JAr0ROMPzy5eQFuiGKYvhQFCnpT5B3-eI-Xac0LtfukfTBVIus5HwdeIjivGWk8QQpxeeqHWIqviZJwFqnVRqaTlbqil2AIJObwqAkWb8OOOfmvWz72b7fFRDLYcyqAFQCuGgz5TJxt-hvvEjFqhEIjvvq7viRqegp3Apq8tjIAwJfmJeVwsrMlM1yci5gapAI1a1tLQPubKS70e5KXxVneYtvVjt2zARrr8C9w.jpg",
      "message_link": null
    },
    "processing_time": null
  }
};

// 模拟完整搜索结果
const mockSearchResults = {
  data: [mockTelegramResult]
};

console.log('🧪 测试Telegram数据处理');
console.log('输入数据:', JSON.stringify(mockTelegramResult, null, 2));
console.log('\n✅ 关键信息:');
console.log('- 找到账户:', mockTelegramResult.data.telegram_found);
console.log('- 用户名:', mockTelegramResult.data.user_info.username);
console.log('- 头像URL:', mockTelegramResult.data.user_info.avatar_url);
console.log('- 高清头像URL:', mockTelegramResult.data.user_info.avatar_url_hd);

// 模拟前端 PlatformExtractor 的处理逻辑
function testPlatformExtraction() {
  console.log('\n🔍 测试前端数据提取...');
  
  // 模拟 extractAvatarUrl 函数
  const extractAvatarUrl = (data) => {
    if (!data || typeof data !== 'object') return null;
    
    const avatarFields = [
      'avatar_url_hd', 'profile_pic_url_hd', 'image_hd', 'photo_hd',
      'avatar_url', 'avatar',
      'profile_image_url', 'profile_image', 'profile_picture', 'profile_pic', 'profile_pic_url',
      'image_url', 'image',
      'photo_url', 'photo',
      'picture_url', 'picture'
    ];
    
    for (const field of avatarFields) {
      const val = data[field];
      if (val && typeof val === 'string' && val.startsWith('http')) {
        return val;
      }
    }
    return null;
  };
  
  const userInfo = mockTelegramResult.data.user_info;
  const avatarUrl = extractAvatarUrl(userInfo);
  
  console.log('提取的头像URL:', avatarUrl);
  console.log('头像提取成功:', !!avatarUrl);
  
  return avatarUrl;
}

testPlatformExtraction();