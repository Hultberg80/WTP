(function() {
    // Maximum number of retries
    const MAX_RETRIES = 3;
    
    // Improved session refresh function with retry logic
    function refreshSession(retries = 0) {
      console.log("Refreshing session...");
      
      // Lägg till timestamp som query parameter för att förhindra caching
      fetch('/api/session/refresh?_=' + new Date().getTime(), {
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        // Add timeout for fetch
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })
        .then(response => {
          // Check for non-200 responses
          if (!response.ok) {
            throw new Error(`Session refresh failed with status ${response.status}`);
          }
          
          // Safely try to parse JSON
          return response.text().then(text => {
            try {
              return JSON.parse(text);
            } catch (e) {
              console.warn('Invalid JSON response from server:', text.substring(0, 100) + '...');
              // Return a minimal valid object to prevent errors downstream
              return { sessionId: 'error-parsing-json', error: true };
            }
          });
        })
        .then(data => {
          console.log('Session refreshed:', data);
          
          // Safely store in localStorage
          try {
            // Spara session-ID i localStorage
            localStorage.setItem('sessionId', data.sessionId || 'unknown');
            localStorage.setItem('lastRefresh', new Date().toISOString());
          } catch (e) {
            console.warn('Error saving to localStorage:', e);
          }
          
          // Trigga uppdatering av React-komponenterna om det behövs
          if (window.refreshAppData && typeof window.refreshAppData === 'function') {
            try {
              window.refreshAppData(data);
            } catch (e) {
              console.error('Error calling refreshAppData:', e);
            }
          }
          
          // Only reload if explicitly needed and more than 60 minutes has passed
          try {
            const lastRefresh = localStorage.getItem('lastRefresh');
            if (lastRefresh && !data.error) {
              const timeDiff = new Date() - new Date(lastRefresh);
              if (timeDiff > 60 * 60 * 1000) {
                console.log('Session refresh timeout exceeded, reloading page');
                window.location.reload();
              }
            }
          } catch (e) {
            console.warn('Error checking refresh time:', e);
          }
        })
        .catch(error => {
          console.error('Session refresh error:', error);
          
          // Retry logic - if we haven't reached max retries, try again after a delay
          if (retries < MAX_RETRIES) {
            const delay = Math.pow(2, retries) * 1000; // Exponential backoff
            console.log(`Retrying session refresh in ${delay}ms (retry ${retries + 1}/${MAX_RETRIES})`);
            
            setTimeout(() => {
              refreshSession(retries + 1);
            }, delay);
          } else {
            console.warn('Maximum retries reached for session refresh');
            
            // Even after max retries, still try to update the UI with whatever data we have
            if (window.refreshAppData && typeof window.refreshAppData === 'function') {
              try {
                window.refreshAppData({ error: true, message: 'Session refresh failed' });
              } catch (e) {
                console.error('Error calling refreshAppData after failures:', e);
              }
            }
          }
        });
    }
  
    // Utför refresh vid laddning
    window.onload = function() {
      // Wrap in try-catch to ensure any startup errors don't break the page
      try {
        refreshSession();
      } catch (e) {
        console.error('Fatal error during session refresh:', e);
      }
    };
  })();