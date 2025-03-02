#include <iostream>
#include <string>
#include <vector>
#include <zlib.h>
#include <sstream>
#include <cstring>

// Base64 encoding table
static const std::string base64_chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Base64 encoding function
std::string base64_encode(const std::string &input)
{
    std::string ret;
    int i = 0;
    unsigned char char_array_3[3];
    unsigned char char_array_4[4];
    int in_len = input.length();
    const unsigned char *bytes_to_encode = reinterpret_cast<const unsigned char *>(input.c_str());

    while (in_len--)
    {
        char_array_3[i++] = *(bytes_to_encode++);
        if (i == 3)
        {
            char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
            char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
            char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);
            char_array_4[3] = char_array_3[2] & 0x3f;

            for (i = 0; i < 4; i++)
                ret += base64_chars[char_array_4[i]];
            i = 0;
        }
    }

    if (i)
    {
        for (int j = i; j < 3; j++)
            char_array_3[j] = '\0';

        char_array_4[0] = (char_array_3[0] & 0xfc) >> 2;
        char_array_4[1] = ((char_array_3[0] & 0x03) << 4) + ((char_array_3[1] & 0xf0) >> 4);
        char_array_4[2] = ((char_array_3[1] & 0x0f) << 2) + ((char_array_3[2] & 0xc0) >> 6);

        for (int j = 0; j < i + 1; j++)
            ret += base64_chars[char_array_4[j]];

        while (i++ < 3)
            ret += '=';
    }
    return ret;
}

// Compression function
std::string compress_data(const std::string &data)
{
    z_stream zs;
    memset(&zs, 0, sizeof(zs));

    if (deflateInit2(&zs, Z_BEST_COMPRESSION, Z_DEFLATED, MAX_WBITS | 16, 8, Z_DEFAULT_STRATEGY) != Z_OK)
    {
        throw std::runtime_error("deflateInit failed");
    }

    zs.next_in = reinterpret_cast<Bytef *>(const_cast<char *>(data.data()));
    zs.avail_in = data.size();

    int ret;
    char outbuffer[32768];
    std::string compressed;

    do
    {
        zs.next_out = reinterpret_cast<Bytef *>(outbuffer);
        zs.avail_out = sizeof(outbuffer);

        ret = deflate(&zs, Z_FINISH);

        if (compressed.size() < zs.total_out)
        {
            compressed.append(outbuffer, zs.total_out - compressed.size());
        }
    } while (ret == Z_OK);

    deflateEnd(&zs);

    if (ret != Z_STREAM_END)
    {
        throw std::runtime_error("compression failed");
    }

    return compressed;
}

// URL encode function to handle special characters
std::string url_encode(const std::string &str)
{
    std::string encoded;
    for (char c : str)
    {
        if (isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~')
        {
            encoded += c;
        }
        else
        {
            encoded += '%';
            encoded += "0123456789ABCDEF"[static_cast<unsigned char>(c) >> 4];
            encoded += "0123456789ABCDEF"[static_cast<unsigned char>(c) & 15];
        }
    }
    return encoded;
}

std::string create_shareable_url(const std::string &expression, const std::string &sizes)
{
    // Convert the strings to proper JSON strings with quotes
    std::string json_expr = "\"" + expression + "\"";
    std::string json_sizes = "[" + sizes + "]"; // Wrap sizes in array brackets

    std::string compressed_expr = compress_data(json_expr);
    std::string compressed_sizes = compress_data(json_sizes);

    std::string base64_expr = url_encode(base64_encode(compressed_expr));
    std::string base64_sizes = url_encode(base64_encode(compressed_sizes));

    return "https://seriousseal.github.io/tensor_expressions_webapp/?e=" + base64_expr + "&s=" + base64_sizes;
}

int main()
{
    // Your tensor expression and index sizes as strings
    std::string expression = "[41,10,11],[[9,10,24,25],[[[63,87,11],[81,87,24,25]->[11,24,25,63,81]],[[86,65,63],[[[[77,65,53,70],[70,75,81]->[53,65,75,77,81]],[[53,83,61],[61,75,22,23]->[22,23,53,75,83]]->[22,23,65,77,81,83]],[[[47,8,9],[7,8,22,23]->[7,9,22,23,47]],[[[31,40,41],[[39,40,46,47],[46,6,7]->[6,7,39,40,47]]->[6,7,31,39,41,47]],[[[[54,60,66],[[[59,76,77],[82,76,52,54]->[52,54,59,77,82]],[[85,57,82],[[64,78,85,59],[[79,78,86],[[80,79],[80,58,64]->[58,64,79]]->[58,64,78,86]]->[58,59,85,86]]->[57,58,59,82,86]]->[52,54,57,58,77,86]]->[52,57,58,60,66,77,86]],[[[52,84,71],[[45,4,5],[[3,4,18,19],[71,60,18,19]->[3,4,60,71]]->[3,5,45,60,71]]->[3,5,45,52,60,84]],[[[[33,38,39],[37,38,44,45]->[33,37,39,44,45]],[[32,36,37],[[29,30,32,33],[[26,28,29],[[26,27],[27,30,31]->[26,30,31]]->[28,29,30,31]]->[28,31,32,33]]->[28,31,33,36,37]]->[28,31,36,39,44,45]],[[44,2,3],[[[1,2,16,17],[74,84,16,17]->[1,2,74,84]],[[[28,34,35],[[35,36,42,43],[43,0,1]->[0,1,35,36,42]]->[0,1,28,34,36,42]],[[[42,50,51],[51,0,14,15]->[0,14,15,42,50]],[[[[68,69,12,13],[[58,55,67],[55,48,68]->[48,58,67,68]]->[12,13,48,58,67,69]],[[[67,57,62,72],[72,56,74]->[56,57,62,67,74]],[[62,69,73],[73,56,14,15]->[14,15,56,62,69]]->[14,15,57,67,69,74]]->[12,13,14,15,48,57,58,74]],[[34,48,49],[49,50,12,13]->[12,13,34,48,50]]->[14,15,34,50,57,58,74]]->[0,34,42,57,58,74]]->[1,28,36,57,58,74]]->[2,28,36,57,58,84]]->[3,28,36,44,57,58,84]]->[3,31,39,45,57,58,84]]->[5,31,39,52,57,58,60]]->[5,31,39,66,77,86]],[[5,6,20,21],[66,83,20,21]->[5,6,66,83]]->[6,31,39,77,83,86]]->[7,41,47,77,83,86]]->[9,22,23,41,77,83,86]]->[9,41,65,81,86]]->[9,41,63,81]]->[9,11,24,25,41]]->[10,11,25,41]]->[11,25]"; // Your full expression
    std::string index_sizes = "2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2";                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         // Your full index sizes

    try
    {
        std::string url = create_shareable_url(expression, index_sizes);
        std::cout << "Shareable URL: " << url << std::endl;
    }
    catch (const std::exception &e)
    {
        std::cerr << "Error: " << e.what() << std::endl;
        return 1;
    }
    return 0;
}
