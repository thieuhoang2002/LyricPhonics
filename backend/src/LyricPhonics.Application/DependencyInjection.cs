using Microsoft.Extensions.DependencyInjection;
using LyricPhonics.Application.Interfaces;
using LyricPhonics.Application.Services;

namespace LyricPhonics.Application;

/// <summary>
/// Phương thức mở rộng (Extension Methods) đăng ký các dịch vụ tầng Application vào IServiceCollection.
/// 
/// 💡 KIẾN THỨC C# / PHỎNG VẤN (Dependency Injection & Service Lifetimes):
/// - 'AddSingleton': Đối tượng chỉ được tạo một lần duy nhất trong suốt vòng đời của ứng dụng.
///   BinarySearchService và LrcService không chứa trạng thái (Stateless), hoàn toàn Thread-safe,
///   nên đăng ký Singleton giúp tiết kiệm chi phí cấp phát bộ nhớ tối đa.
/// </summary>
public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddSingleton<IBinarySearchService, BinarySearchService>();
        services.AddSingleton<ILrcService, LrcService>();

        return services;
    }
}
