using Npgsql;


namespace server;

public class Database
{
    public static NpgsqlDataSource Connection()
    {
        var dataSourceBuilder = new NpgsqlDataSourceBuilder("DefaultConnectionString");
        return dataSourceBuilder.Build();
    }
}