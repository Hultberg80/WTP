namespace server.Classes;

public class User
{
    public int Id { get; set; }
    public string Username { get; set; }
    public string Email { get; set; }
    public int RoleId { get; set; }

    public User(int id, string username, int roleId)
    {
        Id = id;
        Username = username;
        RoleId = roleId;
    }
}