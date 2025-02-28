namespace server.Models;

using System.Text.Json.Serialization;

public class User
{
    public int Id { get; set; }
    public string FirstName { get; set; }
    [JsonConverter(typeof(JsonStringEnumConverter))] 
    public int RoleId { get; set; }
    public string Company  { get; set; }
    
    public User() { }

    public User(int id, string firstname, int roleId, string company)
    {
        Id = id;
        FirstName = firstname;
        RoleId = roleId;
        Company = company;
    }
}