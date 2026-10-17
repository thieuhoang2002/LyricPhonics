using System;
using System.Security.Cryptography;
using System.Text;

namespace LyricPhonics.Infrastructure.Security;

/// <summary>
/// Chuẩn mã hóa Web Crypto cấp quân sự:
/// - PBKDF2 (100.000 vòng lặp SHA-256) cố ý làm chậm chống tấn công brute-force.
/// - AES-256-GCM với Authentication Tag chống can thiệp ciphertext.
/// Server chỉ lưu { ciphertext, salt, iv, tag, hint }, kể cả database bị xâm nhập cũng không bao giờ lộ mật khẩu gốc.
/// </summary>
public static class MilitaryWebCrypto
{
    private const int SaltSize = 16;
    private const int IvSize = 12; // GCM tiêu chuẩn 96-bit IV
    private const int TagSize = 16; // GCM tiêu chuẩn 128-bit Authentication Tag
    private const int KeySize = 32; // 256-bit AES Key
    private const int Iterations = 100_000;

    public record EncryptedPackage(
        string Ciphertext,
        string Salt,
        string Iv,
        string Tag,
        string Hint
    );

    /// <summary>
    /// Mã hóa một chuỗi bí mật (hoặc token xác thực) bằng Master Passphrase với PBKDF2 + AES-GCM.
    /// </summary>
    public static EncryptedPackage Encrypt(string plainText, string masterPassphrase, string hint = "")
    {
        byte[] salt = RandomNumberGenerator.GetBytes(SaltSize);
        byte[] iv = RandomNumberGenerator.GetBytes(IvSize);

        byte[] key = Rfc2898DeriveBytes.Pbkdf2(
            masterPassphrase,
            salt,
            Iterations,
            HashAlgorithmName.SHA256,
            KeySize);

        byte[] plainBytes = Encoding.UTF8.GetBytes(plainText);
        byte[] cipherBytes = new byte[plainBytes.Length];
        byte[] tag = new byte[TagSize];

        using (var aesGcm = new AesGcm(key, TagSize))
        {
            aesGcm.Encrypt(iv, plainBytes, cipherBytes, tag);
        }

        return new EncryptedPackage(
            Ciphertext: Convert.ToBase64String(cipherBytes),
            Salt: Convert.ToBase64String(salt),
            Iv: Convert.ToBase64String(iv),
            Tag: Convert.ToBase64String(tag),
            Hint: hint
        );
    }

    /// <summary>
    /// Giải mã và kiểm tra tính toàn vẹn (Authentication Tag) bằng Master Passphrase.
    /// Trả về chuỗi gốc nếu giải mã thành công, hoặc null nếu mật khẩu sai / bị can thiệp.
    /// </summary>
    public static string? Decrypt(EncryptedPackage package, string masterPassphrase)
    {
        try
        {
            byte[] salt = Convert.FromBase64String(package.Salt);
            byte[] iv = Convert.FromBase64String(package.Iv);
            byte[] tag = Convert.FromBase64String(package.Tag);
            byte[] cipherBytes = Convert.FromBase64String(package.Ciphertext);

            byte[] key = Rfc2898DeriveBytes.Pbkdf2(
                masterPassphrase,
                salt,
                Iterations,
                HashAlgorithmName.SHA256,
                KeySize);

            byte[] plainBytes = new byte[cipherBytes.Length];

            using (var aesGcm = new AesGcm(key, TagSize))
            {
                aesGcm.Decrypt(iv, cipherBytes, tag, plainBytes);
            }

            return Encoding.UTF8.GetString(plainBytes);
        }
        catch (CryptographicException)
        {
            // Tag không khớp hoặc sai khóa -> xác thực thất bại
            return null;
        }
        catch
        {
            return null;
        }
    }
}
