#include "Camera.h"
#include "Float_union.h"
#include <iostream>


unsigned short Utils_bytes::get_short( char arr[], int index )
{
    unsigned short short_value = 
        ((  arr[index+1]    <<8)    &0xff00) |
        ((  arr[index])             &0x00ff) ;

    return short_value;
}

unsigned short Utils_bytes::get_swaped_short( char arr[], int index )
{
    // Swap is done using inverting index
    unsigned short short_value = 
        ((  arr[index]  <<8)    &0xff00) | 
        ((  arr[index+1])       &0x00ff) ;

    return short_value;
}

short Utils_bytes::swapShort( short short_value )
{
    short swapped_short =      
                ((  short_value <<8)    &0xff00)|
                ((  short_value >>8)    &0x00ff);

    return swapped_short;
}

int Utils_bytes::get_int( char arr[], int index )
{
    int int_value = 
        ((  arr[index+3]    <<24)   &0xff000000) | 
        ((  arr[index+2]    <<16)   &0x00ff0000) | 
        ((  arr[index+1]    <<8)    &0x0000ff00) | 
        ((  arr[index]      )       &0x000000ff) ;

    return int_value;
}

float Utils_bytes::get_float( char arr[], int index )
{
    // Create a 4 bytes variable from arr
    int four_bytes = 
        ((  arr[index]      <<24)   &0xff000000 ) | 
        ((  arr[index+1]    <<16)   &0x00ff0000 ) | 
        ((  arr[index+2]    <<8)    &0x0000ff00 ) | 
        ((  arr[index+3]    )       &0x000000ff ) ;

    Float_union f;
    // Set the four_bytes to the int union in order to access the float value
    f.intix  = four_bytes;
    return f.floatix;
}

float Utils_bytes::swapFloat( float float_value )
{
    // Use float union in order to get the bytes
    Float_union f;
    f.floatix = float_value;

    // Little endian
    int inverted_four_bytes = 
        ((  f.bytes[0]  <<24)   &0xff000000)   |
        ((  f.bytes[1]  <<16)   &0x00ff0000)   |
        ((  f.bytes[2]  <<8)    &0x0000ff00)   |   
        ((  f.bytes[3]  )       &0x000000ff) ;

    // Use float union in order to get float from the inverted four bytes
    Float_union f2;
    f2.intix  = inverted_four_bytes;
    return f2.floatix;
}
//----------------------------------------------------------------------