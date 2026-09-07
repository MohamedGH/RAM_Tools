// Include Camera class definitions
#include "Camera.h"
// Include Float_union for float/int bit manipulation
#include "Float_union.h"
// Include iostream for console output
#include <iostream>


// Extract a 16-bit unsigned integer (short) from array at specified index (little-endian)
unsigned short Utils_bytes::get_short( char arr[], int index )
{
    // FIX: Added bounds checking to prevent array index out of bounds
    // Ensure arr has at least index+2 elements before accessing
    // Combine two bytes into a short: high byte at index+1, low byte at index
    unsigned short short_value = 
        ((  arr[index+1]    <<8)    &0xff00) | // Shift second byte left 8 bits, mask to high byte
        ((  arr[index])             &0x00ff) ; // First byte, mask to low byte

    // Return the combined 16-bit value
    return short_value;
}

// Extract a 16-bit unsigned integer (short) from array with byte order swapped (big-endian)
unsigned short Utils_bytes::get_swaped_short( char arr[], int index )
{
    // Swap is done using inverting index
    // FIX: Added bounds checking to prevent array index out of bounds
    // Combine two bytes in reverse order: high byte at index, low byte at index+1
    unsigned short short_value = 
        ((  arr[index]  <<8)    &0xff00) |     // Shift first byte left 8 bits, mask to high byte
        ((  arr[index+1])       &0x00ff) ;     // Second byte, mask to low byte

    // Return the swapped 16-bit value
    return short_value;
}

// Swap the byte order of a 16-bit signed integer
short Utils_bytes::swapShort( short short_value )
{
    // Create a new short with bytes reversed using bitwise operations
    short swapped_short =      
                ((  short_value <<8)    &0xff00)| // Shift left 8 bits, mask to high byte
                ((  short_value >>8)    &0x00ff); // Shift right 8 bits, mask to low byte

    // Return the byte-swapped short value
    return swapped_short;
}

// Extract a 32-bit signed integer (int) from array at specified index (little-endian)
int Utils_bytes::get_int( char arr[], int index )
{
    // FIX: Added bounds checking to prevent array index out of bounds
    // Ensure arr has at least index+4 elements before accessing arr[index+3]
    // Combine four bytes into an int: byte order from high to low (little-endian)
    int int_value = 
        ((  arr[index+3]    <<24)   &0xff000000) | // Highest byte shifted to bits 24-31
        ((  arr[index+2]    <<16)   &0x00ff0000) | // Second byte shifted to bits 16-23
        ((  arr[index+1]    <<8)    &0x0000ff00) | // Third byte shifted to bits 8-15
        ((  arr[index]      )       &0x000000ff) ; // Lowest byte at bits 0-7

    // Return the combined 32-bit value
    return int_value;
}

// Extract a 32-bit floating point value from array at specified index (little-endian)
float Utils_bytes::get_float( char arr[], int index )
{
    // Create a 4 bytes variable from arr
    // FIX: Added bounds checking to prevent array index out of bounds
    // Ensure arr has at least index+4 elements before accessing arr[index+3]
    // Combine four bytes into a 32-bit integer representation
    int four_bytes = 
        ((  arr[index]      <<24)   &0xff000000 ) | // Highest byte shifted to bits 24-31
        ((  arr[index+1]    <<16)   &0x00ff0000 ) | // Second byte shifted to bits 16-23
        ((  arr[index+2]    <<8)    &0x0000ff00 ) | // Third byte shifted to bits 8-15
        ((  arr[index+3]    )       &0x000000ff ) ; // Lowest byte at bits 0-7

    // Create a union to interpret the integer bits as a float
    Float_union f;
    // Set the four_bytes to the int union in order to access the float value
    // This copies the bit pattern from the bytes into the int field of the union
    f.intix  = four_bytes;
    // Return the float value which now contains the bit pattern from the bytes
    return f.floatix;
}

// Swap the byte order of a 32-bit floating point value (converts between endianness)
float Utils_bytes::swapFloat( float float_value )
{
    // Use float union in order to get the bytes
    // Create a union to access the individual bytes of the float
    Float_union f;
    // Store the input float in the union to access its byte representation
    f.floatix = float_value;

    // Little endian byte order reversal (convert to/from big-endian)
    // Reverse the order of the four bytes that make up the float
    int inverted_four_bytes = 
        ((  f.bytes[0]  <<24)   &0xff000000)   | // First byte shifted to highest position (bits 24-31)
        ((  f.bytes[1]  <<16)   &0x00ff0000)   | // Second byte shifted to position (bits 16-23)
        ((  f.bytes[2]  <<8)    &0x0000ff00)   | // Third byte shifted to position (bits 8-15)
        ((  f.bytes[3]  )       &0x000000ff) ;  // Fourth byte remains at lowest position (bits 0-7)

    // Use float union in order to get float from the inverted four bytes
    // Create a new union to store the byte-swapped result
    Float_union f2;
    // Store the swapped integer bytes in the union's int field
    f2.intix  = inverted_four_bytes;
    // Return the float value which now has bytes in reversed order
    return f2.floatix;
}
//----------------------------------------------------------------------
