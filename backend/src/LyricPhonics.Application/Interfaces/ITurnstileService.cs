using System.Threading;
using System.Threading.Tasks;

namespace LyricPhonics.Application.Interfaces;

/// <summary>
/// Giao diện dịch vụ kiểm tra Cloudflare Turnstile chống bot và spam form đăng ký/đăng nhập.
/// </summary>
public interface ITurnstileService
{
    Task<bool> VerifyTokenAsync(string? token, string? remoteIp = null, CancellationToken cancellationToken = default);
}
