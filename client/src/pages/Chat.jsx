import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

function Chat() {
    const { token } = useParams();
    const [chatData, setChatData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchChatData = async () => {
            setLocalLoading(true);
            setLoading(true);
            setError(null);
            
            try {
                console.log('Fetching data for token:', token); // Debug log
                const response = await fetch(`/api/formsubmissions/${token}`, {
                    headers: {
                        'Accept': 'application/json',
                        'Cache-Control': 'no-cache'
                    }
                });

                console.log('Response status:', response.status); // Debug log

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                console.log('Received data:', data); // Debug log

                if (isMounted) {
                    setChatData(data);
                    setLocalLoading(false);
                    setLoading(false); 
                }
            } catch (error) {
                console.error('Fetch error:', error);
                if (isMounted) {
                    setError(error.message);
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        if (token) {
            fetchChatData();
        }

        return () => {
            isMounted = false;
        };
    }, [token]);

    if (loading) return null;
        
    
    

    if (error) {
        return <p className="text-red-500">Error: {error}</p>;
    }

    if (!chatData) {
        return <p>Ingen chat data hittades</p>;
    }

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Chat Support</h1>
            <div>
                <p>Välkommen {chatData.firstName}!</p>
                <p className="mt-2 mb-4">{chatData.about}</p>
                <button className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                    Starta Chat
                </button>
            </div>
        </div>
    );
}

export default Chat;