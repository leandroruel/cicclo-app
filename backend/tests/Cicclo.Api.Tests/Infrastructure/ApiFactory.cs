using Cicclo.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Cicclo.Api.Tests.Infrastructure;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    private readonly string _connectionString =
        $"Data Source={Guid.NewGuid():N};Mode=Memory;Cache=Shared";
    private SqliteConnection? _anchorConnection;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        _anchorConnection = new SqliteConnection(_connectionString);
        _anchorConnection.Open();

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseSqlite(_connectionString));
        });
    }

    protected override void Dispose(bool disposing)
    {
        base.Dispose(disposing);

        if (disposing)
        {
            _anchorConnection?.Dispose();
        }
    }
}
