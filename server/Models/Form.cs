using System.ComponentModel.DataAnnotations;
using System.Text.Json.Nodes;

namespace server.Models;

public class Form
{
    [Key]
    public int Id { get; set; }

    [Required]
    public string Title { get; set; } = string.Empty;

    [Required]
    public JsonNode Fields { get; set; } = new JsonObject(); // JSONB field
}