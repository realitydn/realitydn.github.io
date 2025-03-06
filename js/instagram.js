/**
 * Reality Website - Instagram Feed Integration
 * 
 * This script fetches and displays Instagram posts via the Instagram Basic Display API.
 * Requires an Instagram Basic Display API token.
 * 
 * Alternatively, you can use a third-party service like Elfsight, Curator.io, 
 * or Instafeed.js for easier integration.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Instagram feed container
    const instagramFeed = document.getElementById('instagram-feed');
    
    // Your Instagram Access Token
    // To get a token, visit https://developers.facebook.com/docs/instagram-basic-display-api/getting-started
    const accessToken = 'YOUR_INSTAGRAM_ACCESS_TOKEN';
    
    // Number of posts to display
    const count = 8;
    
    // Fetch Instagram posts
    fetchInstagramPosts(accessToken, count);
    
    /**
     * Fetches Instagram posts using the Instagram Basic Display API
     * @param {string} token - Instagram access token
     * @param {number} count - Number of posts to fetch
     */
    async function fetchInstagramPosts(token, count) {
        try {
            // Fetch user's media
            const response = await fetch(
                `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&access_token=${token}&limit=${count}`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch Instagram posts');
            }
            
            const data = await response.json();
            
            // Render posts
            if (data && data.data && data.data.length > 0) {
                renderInstagramPosts(data.data);
            } else {
                renderFallbackPosts();
            }
        } catch (error) {
            console.error('Error fetching Instagram posts:', error);
            renderFallbackPosts();
        }
    }
    
    /**
     * Renders Instagram posts to the feed container
     * @param {Array} posts - Array of Instagram post objects
     */
    function renderInstagramPosts(posts) {
        // Clear container
        instagramFeed.innerHTML = '';
        
        // Add each post
        posts.forEach(post => {
            // Skip non-image posts if desired
            if (post.media_type !== 'IMAGE' && post.media_type !== 'CAROUSEL_ALBUM') {
                return;
            }
            
            // Create post element
            const postElement = document.createElement('a');
            postElement.href = post.permalink;
            postElement.target = '_blank';
            postElement.rel = 'noopener noreferrer';
            postElement.className = 'instagram-item';
            
            // Get image URL (use thumbnail_url for videos)
            const imageUrl = post.media_type === 'VIDEO' ? post.thumbnail_url : post.media_url;
            
            // Create caption text
            const caption = post.caption ? post.caption.substring(0, 100) + (post.caption.length > 100 ? '...' : '') : '';
            
            // Set inner HTML
            postElement.innerHTML = `
                <img src="${imageUrl}" alt="Instagram post">
                <div class="instagram-item-overlay">
                    <div class="instagram-item-caption">${caption}</div>
                </div>
            `;
            
            // Add to container
            instagramFeed.appendChild(postElement);
        });
    }
    
    /**
     * Renders fallback posts when API fails or during development
     */
    function renderFallbackPosts() {
        // Sample posts for development or when API fails
        const fallbackPosts = [
            {
                image: 'images/instagram/post1.jpg',
                caption: 'Quiz night champions! #RealityDN #DaNang',
                link: '#'
            },
            {
                image: 'images/instagram/post2.jpg',
                caption: 'Tonight\'s specialty cocktail: Lemongrass Passion. #RealityDN #Cocktails',
                link: '#'
            },
            {
                image: 'images/instagram/post3.jpg',
                caption: 'Language exchange night in full swing. #RealityDN #LearnVietnamese',
                link: '#'
            },
            {
                image: 'images/instagram/post4.jpg',
                caption: 'Board game afternoon - new friends made! #RealityDN #BoardGames',
                link: '#'
            },
            {
                image: 'images/instagram/post5.jpg',
                caption: 'Our signature popcorn flavors - which one's your favorite? #RealityDN #Snacks',
                link: '#'
            },
            {
                image: 'images/instagram/post6.jpg',
                caption: 'Movie night under the stars ✨ #RealityDN #MovieNight',
                link: '#'
            },
            {
                image: 'images/instagram/post7.jpg',
                caption: 'Cold brew & sunshine ☀️ #RealityDN #ColdBrew #Coffee',
                link: '#'
            },
            {
                image: 'images/instagram/post8.jpg',
                caption: 'Weekend vibes at Reality #RealityDN #DaNangNights',
                link: '#'
            }
        ];
        
        // Clear container
        instagramFeed.innerHTML = '';
        
        // Add each fallback post
        fallbackPosts.forEach(post => {
            const postElement = document.createElement('a');
            postElement.href = post.link;
            postElement.className = 'instagram-item';
            
            postElement.innerHTML = `
                <img src="${post.image}" alt="Instagram post">
                <div class="instagram-item-overlay">
                    <div class="instagram-item-caption">${post.caption}</div>
                </div>
            `;
            
            instagramFeed.appendChild(postElement);
        });
    }
});
