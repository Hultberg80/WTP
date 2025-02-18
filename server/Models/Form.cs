using System.ComponentModel.DataAnnotations;
using Newtonsoft.Json.Linq;

namespace server.Models;

public class Form
{
        [Key]
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = string.Empty;

        [Required]
        public JObject Fields { get; set; } = new JObject(); // JSONB-fält
}