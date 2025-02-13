import { useState, useEffect, useRef } from 'react';
import EmojiPicker from "emoji-picker-react";




export default function ChatLayout() {

    
    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState(""); 
    const emojiPickerRef = useRef(null);







    // Hantera klick utanför emoji-pickern för att stänga den
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target) && !event.target.closest('.emoji')) {
                setOpen(false); // Stäng emoji-pickern när du klickar utanför
            }
        };
    
        document.addEventListener("mousedown", handleClickOutside);
    
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);



    // lägger till emoji-val till message-baren och stänger emojipicker efter
    const handleEmojiClick = (emoji) => {
        setMessage(prevMessage => prevMessage + emoji.emoji);
        setOpen(true);
    };



    // skickar meddelandet 
    const handleSendMessage = () => {
        console.log("Send message:", message); 
        setMessage("");
    };


    return (
        <>
        
            <h1>hejsan123</h1>

            <div className="chat-container">
                <h2>namn här</h2>

                <input 
                    id="text-bar" 
                    type="text" 
                    placeholder="message" 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                />

               
                <div className="emoji" onClick={() => setOpen(!open)}>
                    😃
                </div>

                {/* Visae bara EmojiPicker om man klickar på emojin */}
                {open && <div ref={emojiPickerRef} className="emojipicker"> <EmojiPicker onEmojiClick={handleEmojiClick} /></div>}

                <button className="skicka-knapp" onClick={handleSendMessage}>Send</button>
            </div>
        </>
    );
}
