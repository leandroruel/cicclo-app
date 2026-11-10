using Cicclo.Application.Wallets.GetWallet;
using Cicclo.Application.Wallets.CreditWallet;
using Cicclo.Infrastructure;
using Scalar.AspNetCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddScoped<GetWalletUseCase>();
builder.Services.AddScoped<CreditWalletUseCase>();
builder.Services.AddInfrastructure(builder.Configuration);

var app = builder.Build();

await app.Services.InitializeDatabaseAsync();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference();
}

app.MapControllers();

app.Run();

public partial class Program
{
}
