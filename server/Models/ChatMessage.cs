

namespace server.Models;

using System.ComponentModel.DataAnnotations;


    public class ChatMessage
    {
      
        public int Id { get; set; }
   
        public string ChatToken { get; set; }
        
        
        public string Sender { get; set; }
     
        public string Message { get; set; }
    
        public DateTime  Timestamp { get; set; }
    }

