![GitHub](https://img.shields.io/github/license/msfwebdude/javascript-cpu-simulator?style=plastic) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/msfwebdude/javascript-cpu-simulator?style=plastic)
![GitHub last commit](https://img.shields.io/github/last-commit/msfwebdude/javascript-cpu-simulator?style=plastic)

# Javascript CPU simulator
This is a javascript web page that simulates a cpu.

Try it out [here](http://firoved.com/github/javascript-cpu-simulator/)

The opcodes used are based on the 6502 opcodes.

Currently the following opcodes work:
* ADC
* AND
* ASL
* DEX
* DEY
* INX
* INY
* JMP
* LDA
* LDX
* LDY
* NOP
* STA
* STX
* STY
* TAX
* TXA
* TAY
* TYA

## todo
* handle interupts
* add all flags
* add more opcodes


## Assembly syntax
Whitespace before or after is generally ignored 

* comments begin with a semicolon (;)
* labels end with a semicolon (:)
* immediate values begin with hash dollar sign (#$)
* memory locations begin with dollar sign ($)

