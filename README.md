![GitHub](https://img.shields.io/github/license/msfwebdude/javascript-cpu-simulator?style=plastic) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/msfwebdude/javascript-cpu-simulator?style=plastic)
![GitHub last commit](https://img.shields.io/github/last-commit/msfwebdude/javascript-cpu-simulator?style=plastic)

# Javascript CPU simulator
This is a javascript web page that simulates a CPU.

My first home computer was the [Commodore VIC 20](https://en.wikipedia.org/wiki/Commodore_VIC-20) and I was a fan of the 6502 processor. Back in January of 2015 I created a Visual Basic 6 implementation of a [6502 simulator](https://www.planet-source-code.com/vb/scripts/ShowCode.asp?txtCodeId=22670&lngWId=1). JavaScript is my favorite language because of the way you can overload any object or add things at run time and it's flexibility. So I thought about creating a HTML / CSS / JS project which simulates a 6502 CPU and see how far I could go with it.

The CPU that I am modeling this after is the maker community's beloved 6502 8bit CPU from 1980's. Some famous 6502 based computers are the [Commodore VIC 20](https://en.wikipedia.org/wiki/Commodore_VIC-20), [Atari 2600](https://en.wikipedia.org/wiki/Atari_2600), and the [Apple IIe](https://en.wikipedia.org/wiki/Apple_IIe)

## Try it out
Try it out [here](http://firoved.com/github/javascript-cpu-simulator/)

![Screenshot](assets/img/screenshot-for-readme.png)

## opcodes - assembly language commands
The opcodes used are based on the [6502 opcodes](http://www.6502.org/tutorials/6502opcodes.html).

Currently the following opcodes work:
* ADC
* AND
* ASL
* CLC
* CLI
* CLV
* CLD
* DEX
* DEY
* INX
* INY
* JMP
* LDA
* LDX
* LDY
* NOP
* SEC
* SEI
* SED
* STA
* STX
* STY
* TAX
* TXA
* TAY
* TYA

## todo
Not in order
* handle interupts
* add all flags
* add more opcodes
* add clear commands


## Assembly syntax
Whitespace before or after is generally ignored 

* comments begin with a semicolon (;)
* labels end with a semicolon (:)
* immediate values begin with hash dollar sign (#$)
* memory locations begin with dollar sign ($)

