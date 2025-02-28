namespace server.Models;

using System.Text.Json.Serialization;

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    [JsonConverter(typeof(JsonStringEnumConverter))] 
    public string Role_id { get; set; }
    public string Company  { get; set; }

    public User(int id, string firstname, string role_id, string company)
    {
        Id = id;
        FirstName = firstname;
        Role_id = role_id;
        Company = company;
    }
}