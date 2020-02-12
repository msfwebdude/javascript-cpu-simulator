![GitHub](https://img.shields.io/github/license/msfwebdude/javascript-cpu-simulator?style=plastic) ![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/msfwebdude/javascript-cpu-simulator?style=plastic)
![GitHub last commit](https://img.shields.io/github/last-commit/msfwebdude/javascript-cpu-simulator?style=plastic)

# Javascript CPU simulator
This is a JavaScript web page that simulates a 6502 CPU.

Back in January of 2015, because I was a huge fan of the 6502, I created a Visual Basic 6 implementation of a [6502 simulator](https://www.planet-source-code.com/vb/scripts/ShowCode.asp?txtCodeId=22670&lngWId=1). Since I really love JS, I thought about creating a HTML / CSS / JS project which simulates a 6502 CPU and see how far I could go with it.

The CPU that I am modeling this after is the maker community's beloved 8bit CPU from 1980's, the 6502. Some famous 6502 based computers are the [Commodore VIC 20](https://en.wikipedia.org/wiki/Commodore_VIC-20), [Atari 2600](https://en.wikipedia.org/wiki/Atari_2600), and the [Apple IIe](https://en.wikipedia.org/wiki/Apple_IIe)

## Try it out
Try it out [here](http://firoved.com/github/javascript-cpu-simulator/)

![Screenshot](assets/img/screenshot-for-readme.png)

## opcodes - assembly language commands
The opcodes used are based on the [6502 opcodes](http://www.6502.org/tutorials/6502opcodes.html).

### Currently the following opcodes work:

| Math    | Load and Store | Transfer | Clear and Set | Logic   | Stack   | Branch  | Etc     | 
|:-------:|:--------------:|:--------:|:-------------:|:-------:|:-------:|:-------:|:-------:|
| ADC     | LDA            | TAX      | CLC           | AND     | ~~PHA~~ | ~~BCC~~ | NOP     |
| ASL     | LDX            | TAY      | CLD           | ~~CMP~~ | ~~PLP~~ | ~~BCS~~ | ~~BRK~~ |
| DEX     | LDY            | TSX      | CLI           | ~~CPX~~ | ~~RTI~~ | ~~BEQ~~ |         |
| DEY     | STA            | TXA      | CLV           | ~~CPY~~ | ~~RTS~~ | ~~BMI~~ |         |
| INX     | STX            | TXS      | SEC           | ~~EOR~~ |         | ~~BNE~~ |         |
| INY     | STY            | TYA      | SED           | ~~ORA~~ |         | ~~BPL~~ |         |
| ~~LSR~~ |                |          | SEI           |         |         | ~~BVC~~ |         |
| ~~ROL~~ |                |          |               |         |         | ~~BCS~~ |         |
| ~~ROR~~ |                |          |               |         |         |  JMP    |         |
| ~~SBC~~ |                |          |               |         |         | ~~JSR~~ |         |

## Todo

 The Todo  Kanban Board can be found [here](https://github.com/msfwebdude/javascript-cpu-simulator/projects/1).


## Assembly syntax
Whitespace before or after is generally ignored 

* comments begin with a semicolon (;)
* labels end with a semicolon (:)
* immediate values begin with hash dollar sign (#$)
* memory locations begin with dollar sign ($)

