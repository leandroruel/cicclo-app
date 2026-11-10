namespace Cicclo.Domain.Services;

public sealed class LaundryService
{
    private LaundryService()
    {
    }

    public LaundryService(int id, string name, decimal price, bool active)
    {
        Id = id;
        Name = name;
        Price = price;
        Active = active;
    }

    public int Id { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public decimal Price { get; private set; }

    public bool Active { get; private set; }
}
