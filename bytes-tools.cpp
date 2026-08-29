#include "Camera.h"
#include "Float_union.h"

#include <iostream>

unsigned short Utils_bytes::get_short(char arr[], int index)
{
    // Read a 16-bit value from two consecutive bytes in little-endian order.
    unsigned short short_value =
        ((arr[index + 1] << 8) & 0xff00) |
        ((arr[index]) & 0x00ff);

    return short_value;
}

unsigned short Utils_bytes::get_swaped_short(char arr[], int index)
{
    // Read the same two-byte value with the byte order reversed.
    unsigned short short_value =
        ((arr[index] << 8) & 0xff00) |
        ((arr[index + 1]) & 0x00ff);

    return short_value;
}

short Utils_bytes::swapShort(short short_value)
{
    // Exchange the high and low bytes of the 16-bit value.
    short swapped_short =
        ((short_value << 8) & 0xff00) |
        ((short_value >> 8) & 0x00ff);

    return swapped_short;
}

int Utils_bytes::get_int(char arr[], int index)
{
    // Build a 32-bit integer from four consecutive bytes.
    int int_value =
        ((arr[index + 3] << 24) & 0xff000000) |
        ((arr[index + 2] << 16) & 0x00ff0000) |
        ((arr[index + 1] << 8) & 0x0000ff00) |
        ((arr[index]) & 0x000000ff);

    return int_value;
}

float Utils_bytes::get_float(char arr[], int index)
{
    // Assemble the four bytes used to reconstruct the floating-point value.
    int four_bytes =
        ((arr[index] << 24) & 0xff000000) |
        ((arr[index + 1] << 16) & 0x00ff0000) |
        ((arr[index + 2] << 8) & 0x0000ff00) |
        ((arr[index + 3]) & 0x000000ff);

    // Float_union provides access to the same four bytes as a float.
    Float_union f;
    f.intix = four_bytes;
    return f.floatix;
}

float Utils_bytes::swapFloat(float float_value)
{
    // Copy the floating-point bit representation into the byte-access union.
    Float_union f;
    f.floatix = float_value;

    // Reverse the byte order of the four-byte floating-point representation.
    int inverted_four_bytes =
        ((f.bytes[0] << 24) & 0xff000000) |
        ((f.bytes[1] << 16) & 0x00ff0000) |
        ((f.bytes[2] << 8) & 0x0000ff00) |
        ((f.bytes[3]) & 0x000000ff);

    // Interpret the reordered bytes as a floating-point value again.
    Float_union f2;
    f2.intix = inverted_four_bytes;
    return f2.floatix;
}

//----------------------------------------------------------------------
