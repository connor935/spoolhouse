#pragma once

#include <Arduino.h>

// Derives the 16 MIFARE Classic Key A values for a Bambu Lab tag from its UID.
// Algorithm (community-reverse-engineered, published for interoperability):
//   HKDF-SHA256, salt = fixed 16-byte master, info = "RFID-A\0",
//   IKM = tag UID, output = 96 bytes = 16 keys x 6 bytes; key[sector] is the
//   Key A for that sector.
// keysOut is [sector][6]. Returns false if the HKDF call fails.
bool deriveBambuKeys(const uint8_t *uid, size_t uidLen, uint8_t keysOut[16][6]);
