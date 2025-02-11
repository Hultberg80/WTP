import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';

function Chat() {
    const { token } = useParams();
    const [chatData, setChatData] = useState(null);

    useEffect(() => {
        // Verifiera token och hämta chat-data
        const fetchChatData = async () => {
            try {
                const response = await fetch(`/api/formsubmissions/${token}`);
                if (response.ok) {
                    const data = await response.json();
                    setChatData(data);
                }
            } catch (error) {
                console.error('Error fetching chat data:', error);
            }
        };

        if (token) {
            fetchChatData();
        }
    }, [token]);

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Chat Support</h1>
            {chatData ? (
                <div>
                    <p>Välkommen {chatData.firstName}!</p>
                    <button className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">
                        Starta Chat
                    </button>
                </div>
            ) : (
                <p id='meddelande'>Laddar chat...</p> // Här ska vårt meddelande stå från Form.jsx
            )}
        </div>
    );
}

export default Chat;