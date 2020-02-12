// ╔══════════════════════════════════════════════════════════════════════════════════════╗
// ║                               javascript-cpu-simulator                               ║
// ╠══════════════════════════════════════════════════════════════════════════════════════╣
// ║                                                                                      ║
// ║                    assets/js/cpu.js - the js brains behind it all                    ║
// ║                                                                                      ║
// ║                        Copyright (c) 2019 - 2020 Mike Firoved                        ║
// ║                  MIT License. See ../../LICENSE and ../../README.md                  ║
// ║                                                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════════════════╝


// script source for index.html


// Create CPU Data object in this window, or 'self' object
self.cpuData = {
    cpuEnabled: false,
    clockState: 0,
    memoryArray: [],
    programCounter: 0xFFFE,
    registers: {
        A: 0,
        X: 0,
        Y: 0,
        stackPointer: 0,
    },
    flags: {
        negative: false,
        overflow: false,
        bFlagHigh: false,
        bFlagLow: false,
        decimal: false,
        interupt: false,
        zero: false,
        carry: false,
    },
    assembler: {
        labels: {
            labelLocations: {},
            futureLabels: {},
        },
        privatePointer: 0,
    }
};

// put sample code program into assembly
self.prg.value = `
; sample program for 6502

.chip 65C02

.org $FFFE
.word $0003
    
.org $0003

start:
    SEC
    CLC
    LDA #$00
    STA $0040
    ADC #$1E
    LDA #$04
    ASL A
    STA $0021

addLoop:
    LDA $0040
    TAX
    INX
    TXA
    STA $0040
    JMP addLoop
    NOP

.org $0040
.byte $00
`;


// Clear and Initialize Memory - resets all memory locations 
self.clearAndInitializeMemory = (memorySize) => {
    self.cpuData.memoryArray.length = 0;

    for (let i = 0; i < memorySize; i++) {
        self.cpuData.memoryArray.push(0xff);
    }
}

// Assemble Code - take the assembly language code and convert it into machine language
self.assembleCode = () => {
    // halt cpu for assembly
    self.cpuData.cpuEnabled = self.cpuEnabled.checked = false;

    // clear existing memory
    self.clearAndInitializeMemory(65536);

    // clear assembler label locations
    self.cpuData.assembler.labels.labelLocations = {};
    self.cpuData.assembler.privatePointer = 0;

    // operand type 'constants'
    var operandTypes = {
        NULL: 0,
        IMMEDIATE: 1,
        ABSOLUTE: 2,
    };

    var nextMemoryIndex = 0;

    // iterate through program
    var lines = self.prg.value.replace(/\r\n/g, "\n").split("\n");
    lines.forEach(line => {

        if (line.trim() != "") {
            // check for compiler directive
            if (line.trim().startsWith('.')) {
                var directiveParts = line.trim().split(' ');
                var directiveCode = directiveParts[0].trim().toUpperCase();
                var directiveArgs = line.trim().split(/ |,/ig);
                switch (directiveCode) {
                    case '.ORG':
                        if (directiveParts.length > 1) {
                            var orgAddress = directiveParts[1];
                            if (orgAddress.startsWith('$')) {
                                nextMemoryIndex = parseInt("0x" + orgAddress.substr(1, 4))
                            }
                        }
                        break;

                    case '.BYTE':
                        // .byte $ff, $cc
                        if (directiveArgs.length > 1) {
                            directiveArgs.forEach((byteValue, idx) => {
                                if (byteValue.startsWith('$')) {
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt("0x" + byteValue.substr(1, 2));
                                    nextMemoryIndex++;
                                }
                            }
                            );
                        }
                        break;

                    case '.WORD':
                        // .word $ffee, $99cc
                        // Note: the word is converted to low byte, high byte so that $04ff is stored as $ff $04
                        if (directiveArgs.length > 1) {
                            directiveArgs.forEach((wordValue, idx) => {
                                if (wordValue.startsWith('$')) {
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt("0x" + wordValue.substr(3, 2));
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt("0x" + wordValue.substr(1, 2));
                                    nextMemoryIndex++;
                                }
                            }
                            );
                        }
                        break;
                }
            }
            else {
                // check for comment
                if (!line.trim().startsWith(';')) {
                    // check for label
                    if (line.trim().endsWith(':')) {
                        var labelName = line.trim().replace(':', '');

                        // fix issue with bad label location
                        // var labelLocation = ("0000" + self.cpuData.assembler.privatePointer).substr(-4, 4);
                        var labelLocation = ("0000" + nextMemoryIndex.toString(16)).substr(-4, 4);
                        //console.log(`Label ${labelName} found at ${labelLocation}`);

                        var labelLocationZero = labelLocation.substr(2, 2);
                        var labelLocationIchi = labelLocation.substr(0, 2);

                        self.cpuData.assembler.labels.labelLocations[labelName] = [labelLocationZero, labelLocationIchi];


                        // check for predeclaration label calls
                        if (labelName in self.cpuData.assembler.labels.futureLabels) {
                            // loop through memory to update
                            self.cpuData.assembler.labels.futureLabels[labelName].forEach(
                                (futureLabel, idx) => {
                                    self.cpuData.memoryArray[futureLabel.MemLocationZero] = parseInt(labelLocationZero);
                                    self.cpuData.memoryArray[futureLabel.MemLocationIchi] = parseInt(labelLocationIchi);
                                }
                            );

                            // after processing clear array
                            self.cpuData.assembler.labels.futureLabels[labelName] = [];
                        }
                    }
                    else {
                        var lineParts = line.trim().split(' ');
                        var operation = lineParts[0].toUpperCase();

                        var operand = '';

                        var operandType = 0;
                        var operandValue = [];

                        if (lineParts.length > 1) {
                            operand = lineParts[1];

                            var commentIndex = operand.indexOf(';')

                            // strip end of line comment
                            if (commentIndex > -1) { operand = operand.substr(0, commentIndex - 1); }


                            if (operand.startsWith('#')) {
                                operandType = operandTypes.IMMEDIATE;
                                operandValue.push(parseInt("0x" + operand.substr(2)));
                            }
                            if (operand.startsWith('$')) {
                                if (operand.length != 5) {
                                    alert(`syntax error ${line} absolute values are two bytes.`);
                                    return;
                                }
                                operandType = operandTypes.ABSOLUTE;
                                operandValue.push(parseInt("0x" + operand.substr(3, 2)));
                                operandValue.push(parseInt("0x" + operand.substr(1, 2)));
                            }
                        }

                        //console.log(`${operation} at ${nextMemoryIndex}(${nextMemoryIndex.toString(16)})`);

                        switch (operation) {
                            case 'ADC':
                                switch (operandType) {
                                    case operandTypes.IMMEDIATE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x69);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 2;
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x6D);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 3;
                                        break;
                                }
                                break;
                            case 'AND':
                                switch (operandType) {
                                    case operandTypes.IMMEDIATE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x29);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 2;
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x2D);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 3;
                                        break;
                                }
                                break;
                            case 'ASL':
                                switch (operandType) {
                                    case operandTypes.NULL:
                                        // look for A
                                        if (operand.toUpperCase() == 'A') {
                                            self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x0A);
                                            nextMemoryIndex++;
                                            self.cpuData.assembler.privatePointer++;
                                        }
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x0E);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 3;
                                        break;
                                }
                                break;

                            case 'CLC':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x18);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'SEC':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x38);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'CLI':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x58);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'SEI':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x78);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'CLV':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xB8);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'CLD':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xD8);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'SED':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xF8);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'DEX':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xCA);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'DEY':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x88);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'INX':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xE8);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'INY':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xC8);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'JMP':
                                switch (operandType) {
                                    case operandTypes.NULL:
                                        // look for label
                                        if (operand in self.cpuData.assembler.labels.labelLocations) {
                                            //console.log(`found label ${operand} for $${self.cpuData.assembler.labels.labelLocations[operand][1]}${self.cpuData.assembler.labels.labelLocations[operand][0]}`);
                                            self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x4C);
                                            nextMemoryIndex++;
                                            self.cpuData.memoryArray[nextMemoryIndex] = parseInt(self.cpuData.assembler.labels.labelLocations[operand][0]);
                                            nextMemoryIndex++;
                                            self.cpuData.memoryArray[nextMemoryIndex] = parseInt(self.cpuData.assembler.labels.labelLocations[operand][1]);
                                            nextMemoryIndex++;
                                            self.cpuData.assembler.privatePointer += 3;
                                        }
                                        else {
                                            // maybe label will be declared later
                                            //console.log(`label ${operand} not found in ${JSON.stringify(self.cpuData.assembler.labels.labelLocations)}`);
                                            var MemLocationZero = 0;
                                            var MemLocationIchi = 0;

                                            self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x4C);
                                            nextMemoryIndex++;

                                            self.cpuData.memoryArray[nextMemoryIndex] = 0;
                                            MemLocationZero = nextMemoryIndex;
                                            nextMemoryIndex++;

                                            self.cpuData.memoryArray[nextMemoryIndex] = 0;
                                            MemLocationIchi = nextMemoryIndex;
                                            nextMemoryIndex++;

                                            // if not in future labels yet, init it
                                            if (!(operand in self.cpuData.assembler.labels.futureLabels)) {
                                                self.cpuData.assembler.labels.futureLabels[operand] = [];
                                            }
                                            self.cpuData.assembler.labels.futureLabels[operand].push(
                                                {
                                                    MemLocationZero,
                                                    MemLocationIchi,
                                                }
                                            );
                                        }
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x4C);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 2;
                                        break;
                                }

                                break;

                            case 'LDA':
                                switch (operandType) {
                                    case operandTypes.IMMEDIATE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA9);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 2;
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAD);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 3;
                                        break;
                                }
                                break;

                            case 'LDX':
                                switch (operandType) {
                                    case operandTypes.IMMEDIATE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA2);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 2;
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAE);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 3;
                                        break;
                                }
                                break;

                            case 'LDY':
                                switch (operandType) {
                                    case operandTypes.IMMEDIATE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA0);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 2;
                                        break;

                                    case operandTypes.ABSOLUTE:
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAC);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        self.cpuData.assembler.privatePointer += 3;
                                        break;
                                }
                                break;

                            case 'NOP':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xEA);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'STA':
                                if (operandType == operandTypes.ABSOLUTE) {
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8D);
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                    nextMemoryIndex++;
                                    self.cpuData.assembler.privatePointer += 3;
                                }
                                break;

                            case 'STX':
                                if (operandType == operandTypes.ABSOLUTE) {
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8E);
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                    nextMemoryIndex++;
                                    self.cpuData.assembler.privatePointer += 3;
                                }
                                break;

                            case 'STY':
                                if (operandType == operandTypes.ABSOLUTE) {
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8C);
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                    nextMemoryIndex++;
                                    self.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                    nextMemoryIndex++;
                                    self.cpuData.assembler.privatePointer += 3;
                                }
                                break;

                            case 'TAX':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAA);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'TXA':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8A);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'TAY':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA8);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'TYA':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x98);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'TSX':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xBA);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            case 'TXS':
                                self.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x9A);
                                nextMemoryIndex++;
                                self.cpuData.assembler.privatePointer++;
                                break;

                            default:
                                break;
                        }
                    }
                }
            }


        }
    });

    self.writeMemory();

    // cpu enabled
    self.cpuData.cpuEnabled = self.cpuEnabled.checked = true;

};

// Write Memory - creates a visual representation of the cpu memory
self.writeMemory = () => {
    var memText = ""

    self.cpuData.memoryArray.forEach(
        (memValue, memIndex) => {
            if (memIndex == 0 || ((memIndex / 8) == Math.floor(memIndex / 8))) {
                if (memIndex != 0) { memText += "\n"; }
                memText += ("0000" + memIndex.toString(16).toUpperCase()).substr(-4, 4);
                memText += "  ";
            }
            memText += ("00" + memValue.toString(16).toUpperCase()).substr(-2, 2);
            memText += " ";
        }
    );
    self.mem.value = memText;
    memText.length = 0;

    var fmtRegA = '0x' + ('00' + self.cpuData.registers.A.toString(16).toUpperCase()).substr(-2, 2);
    var fmtRegX = '0x' + ('00' + self.cpuData.registers.X.toString(16).toUpperCase()).substr(-2, 2);
    var fmtRegY = '0x' + ('00' + self.cpuData.registers.Y.toString(16).toUpperCase()).substr(-2, 2);

    self.registers.innerHTML = `Registers:<br />A: ${fmtRegA}&nbsp;&nbsp;X: ${fmtRegX}&nbsp;&nbsp;Y: ${fmtRegY}`;

    var fmtFlags = '';
    fmtFlags += `NEG:&nbsp;${self.cpuData.flags.negative ? '1' : '0'}&nbsp;`;
    fmtFlags += `OVR:&nbsp;${self.cpuData.flags.overflow ? '1' : '0'}&nbsp;`;
    fmtFlags += `DEC:&nbsp;${self.cpuData.flags.decimal ? '1' : '0'}&nbsp;`;
    fmtFlags += `INT:&nbsp;${self.cpuData.flags.interupt ? '1' : '0'}&nbsp;`;
    fmtFlags += `ZER:&nbsp;${self.cpuData.flags.zero ? '1' : '0'}&nbsp;`;
    fmtFlags += `CAR:&nbsp;${self.cpuData.flags.carry ? '1' : '0'}&nbsp;`;


    self.flags.innerHTML = `Flags:<br />${fmtFlags}`;
};

// Loader Run - executes the machine language code
self.loaderRun = () => {

    if (self.cpuData.programCounter == 0xFFFE) {
        // get word to find origin
        self.cpuData.programCounter = parseInt('0x' + self.cpuData.memoryArray[0xFFFF].toString(16).toUpperCase() + self.cpuData.memoryArray[0xFFFE].toString(16).toUpperCase());
    }

    var operation = self.cpuData.memoryArray[self.cpuData.programCounter];
    var opPlusOne = self.cpuData.memoryArray[self.cpuData.programCounter + 1] || 0;
    var opPlusTwo = self.cpuData.memoryArray[self.cpuData.programCounter + 2] || 0;
    var oneAndTwo = parseInt('0x' + opPlusTwo.toString(16) + opPlusOne.toString(16));
    var memoryVal = self.cpuData.memoryArray[oneAndTwo];

    var fmtAddress = '0x' + ('0000' + oneAndTwo.toString(16).toUpperCase()).substr(-4, 4);
    var fmtImValue = '0x' + ('0000' + opPlusOne.toString(16).toUpperCase()).substr(-2, 2);
    var fmtCounter = '0x' + ('0000' + self.cpuData.programCounter.toString(16).toUpperCase()).substr(-4, 4);
    var currentPfx = `Current Operation: ${fmtCounter}&nbsp;`;

    //console.log(`${operation.toString(16)} => opPlusOne: ${opPlusOne}, opPlusTwo: ${opPlusTwo}, oneAndTwo: ${oneAndTwo}, fmtAddress: ${fmtAddress} `);

    switch (operation) {
        case 0x69:
            // ADC immediate 
            self.loader.innerHTML = `${currentPfx} ADC ${fmtImValue}`;
            var sum = self.cpuData.registers.A + opPlusOne;
            self.cpuData.flags.carry = false;
            if(sum > 0xFF){
                sum &= 0xFF;
                self.cpuData.flags.carry = true;
            }
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.flags.overflow = (!((opPlusOne ^ self.cpuData.registers.A) & 0x80));
            self.cpuData.registers.A = sum;
            self.cpuData.programCounter += 2;
            break;

        case 0x6D:
            // ADC absolute
            self.loader.innerHTML = `${currentPfx} ADC ${oneAndTwo}`;
            var sum = self.cpuData.registers.A + memoryVal;
            self.cpuData.flags.carry = false;
            if(sum > 0xFF){
                sum &= 0xFF;
                self.cpuData.flags.carry = true;
            }
            self.cpuData.registers.A = sum;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.flags.overflow = (!((memoryVal ^ self.cpuData.registers.A) & 0x80));
            self.cpuData.programCounter += 3;
            break;

        case 0x29:
            // AND immediate 
            self.loader.innerHTML = `${currentPfx} AND ${fmtImValue}`;
            var sum = self.cpuData.registers.A & opPlusOne;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;
            self.cpuData.programCounter += 2;
            break;

        case 0x2D:
            // AND absolute
            self.loader.innerHTML = `${currentPfx} AND ${oneAndTwo}`;
            var sum = self.cpuData.registers.A & memoryVal;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;            
            self.cpuData.programCounter += 3;
            break;


        case 0x0A:
            // ASL A
            self.loader.innerHTML = `${currentPfx} ASL A`;
            var sum = self.cpuData.registers.A << 1;
            self.cpuData.flags.carry = false;
            if(sum > 0xFF){
                sum &= 0xFF;
                self.cpuData.flags.carry = true;
            }
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;
            self.cpuData.programCounter += 1;
            break;

        case 0x0E:
            // ASL absolute
            self.loader.innerHTML = `${currentPfx} ASL ${oneAndTwo}`;
            var sum = self.cpuData.memoryArray[oneAndTwo] << 1;
            self.cpuData.flags.carry = false;
            if(sum > 0xFF){
                sum &= 0xFF;
                self.cpuData.flags.carry = true;
            }
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.memoryArray[oneAndTwo] = sum;            
            self.cpuData.programCounter += 3;
            break;

        case 0xCA:
            // DEX
            self.loader.innerHTML = `${currentPfx} DEX`;
            var sum = self.cpuData.registers.X - 1;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.X = sum;
            self.cpuData.programCounter += 1;
            break;

        case 0x88:
            // DEY 
            self.loader.innerHTML = `${currentPfx} DEY`;
            var sum = self.cpuData.registers.Y - 1;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.Y    = sum;
            self.cpuData.programCounter += 1;
            break;

        case 0xE8:
            // INX
            self.loader.innerHTML = `${currentPfx} INX`;
            var sum = self.cpuData.registers.X + 1;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.X    = sum;
            self.cpuData.programCounter += 1;
            break;

        case 0xC8:
            // INY
            self.loader.innerHTML = `${currentPfx} INY`;
            var sum = self.cpuData.registers.Y + 1;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.Y    = sum;
            self.cpuData.programCounter += 1;
            break;

        case 0x4C:
            // JMP 
            var hexOneAndTwo = parseInt('0x' + oneAndTwo);
            self.loader.innerHTML = `${currentPfx} JMP to ${fmtAddress}`;
            self.cpuData.programCounter = hexOneAndTwo;
            break;

        case 0xA9:
            // LDA immediate
            self.loader.innerHTML = `${currentPfx} LDA ${fmtImValue}`;
            var sum = opPlusOne;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;
            self.cpuData.programCounter += 2;
            break;

        case 0xAD:
            // LDA absolute
            self.loader.innerHTML = `${currentPfx} LDA ${fmtAddress}`;
            var sum = memoryVal;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;
            self.cpuData.programCounter += 3;
            break;

        case 0xA2:
            // LDX immediate
            self.loader.innerHTML = `${currentPfx} LDX ${fmtImValue}`;
            var sum = opPlusOne;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.X    = sum;
            self.cpuData.programCounter += 2;
            break;

        case 0xAE:
            // LDX absolute
            self.loader.innerHTML = `${currentPfx} LDX ${fmtAddress}`;
            var sum = memoryVal;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.x    = sum;
            self.cpuData.programCounter += 3;
            break;

        case 0xA0:
            // LDY immediate
            self.loader.innerHTML = `${currentPfx} LDY ${fmtImValue}`;
            var sum = opPlusOne;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.Y    = sum;
            self.cpuData.programCounter += 2;
            break;

        case 0xAC:
            // LDY absolute
            self.loader.innerHTML = `${currentPfx} LDY ${fmtAddress}`;
            var sum = memoryVal;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.Y    = sum;            
            self.cpuData.programCounter += 3;
            break;

        case 0xEA:
            // NOP
            self.loader.innerHTML = `${currentPfx} NOP`;
            self.cpuData.programCounter += 1;
            break;

        case 0x8D:
            // STA
            self.loader.innerHTML = `${currentPfx} STA ${fmtAddress}`;
            self.cpuData.memoryArray[oneAndTwo] = self.cpuData.registers.A;
            self.cpuData.programCounter += 3;
            break;

        case 0x8E:
            // STX
            self.loader.innerHTML = `${currentPfx} STX ${fmtAddress}`;
            self.cpuData.memoryArray[oneAndTwo] = self.cpuData.registers.X;
            self.cpuData.programCounter += 3;
            break;

        case 0x8C:
            // STY
            self.loader.innerHTML = `${currentPfx} STY ${fmtAddress}`;
            self.cpuData.memoryArray[oneAndTwo] = self.cpuData.registers.Y;
            self.cpuData.programCounter += 3;
            break;

        case 0xAA:
            // TAX
            self.loader.innerHTML = `${currentPfx} TAX`;
            var sum = self.cpuData.registers.A;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.X    = sum;            
            self.cpuData.programCounter += 1;
            break;

        case 0x8A:
            // TXA
            self.loader.innerHTML = `${currentPfx} TXA`;
            var sum = self.cpuData.registers.X;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;            
            self.cpuData.programCounter += 1;
            break;

        case 0xA8:
            // TAY
            self.loader.innerHTML = `${currentPfx} TAY`;
            var sum = self.cpuData.registers.A;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.Y    = sum;                
            self.cpuData.programCounter += 1;
            break;

        case 0x98:
            // TYA
            self.loader.innerHTML = `${currentPfx} TYA`;
            var sum = self.cpuData.registers.Y;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.A    = sum;               
            self.cpuData.programCounter += 1;
            break;


        case 0x18:
            // CLC
            self.loader.innerHTML = `${currentPfx} CLC`;
            self.cpuData.flags.carry = false;
            self.cpuData.programCounter += 1;
            break;


        case 0x38:
            // SEC
            self.loader.innerHTML = `${currentPfx} SEC`;
            self.cpuData.flags.carry = true;
            self.cpuData.programCounter += 1;
            break;


        case 0x58:
            // CLI
            self.loader.innerHTML = `${currentPfx} CLI`;
            self.cpuData.flags.interupt = false;
            self.cpuData.programCounter += 1;
            break;


        case 0x78:
            // SEI
            self.loader.innerHTML = `${currentPfx} SEI`;
            self.cpuData.flags.interupt = true;
            self.cpuData.programCounter += 1;
            break;


        case 0xB8:
            // CLV
            self.loader.innerHTML = `${currentPfx} CLV`;
            self.cpuData.flags.overflow = false;
            self.cpuData.programCounter += 1;
            break;


        case 0xD8:
            // CLD
            self.loader.innerHTML = `${currentPfx} CLD`;
            self.cpuData.flags.decimal = false;
            self.cpuData.programCounter += 1;
            break;


        case 0xF8:
            // SED
            self.loader.innerHTML = `${currentPfx} SED`;
            self.cpuData.flags.decimal = true;
            self.cpuData.programCounter += 1;
            break;

        case 0x9A:
            // TXS
            self.loader.innerHTML = `${currentPfx} TAY`;
            var sum = self.cpuData.registers.X;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.stackPointer    = sum;                
            self.cpuData.programCounter += 1;
            break;

        case 0xBA:
            // TSX
            self.loader.innerHTML = `${currentPfx} TYA`;
            var sum = self.cpuData.registers.stackPointer;
            self.cpuData.flags.zero     = (sum == 0);
            self.cpuData.flags.negative = (sum > 0x7F);
            self.cpuData.registers.X    = sum;               
            self.cpuData.programCounter += 1;
            break;

        default:
            break;
    }

    self.writeMemory();

    if (self.cpuData.programCounter >= self.cpuData.memoryArray.length) { self.cpuData.programCounter = 0xFFFE; }
};

//Convert Value to Flags -  bitwise convert flags from value to flags object
self.convertValueToFlags = (flagsValue) => {
    var neoflags = {
        negative:  ((flagsValue & 0b10000000) != 0),
        overflow:  ((flagsValue & 0b01000000) != 0),
        bFlagHigh: ((flagsValue & 0b00100000) != 0),
        bFlagLow:  ((flagsValue & 0b00010000) != 0),
        decimal:   ((flagsValue & 0b00001000) != 0),
        interupt:  ((flagsValue & 0b00000100) != 0),
        zero:      ((flagsValue & 0b00000010) != 0),
        carry:     ((flagsValue & 0b00000001) != 0),
    };
    return neoflags;
};

// Convert Flags to Value -  bitwise convert flags from flags object to value
self.convertFlagsToValue = (flagsObject) => {
    var neoValue = 0;
    neoValue += ((flagsObject.negative  ? 0b10000000 : 0));
    neoValue += ((flagsObject.overflow  ? 0b01000000 : 0));
    neoValue += ((flagsObject.bFlagHigh ? 0b00100000 : 0));
    neoValue += ((flagsObject.bFlagLow  ? 0b00010000 : 0));
    neoValue += ((flagsObject.decimal   ? 0b00001000 : 0));
    neoValue += ((flagsObject.interupt  ? 0b00000100 : 0));
    neoValue += ((flagsObject.zero      ? 0b00000010 : 0));
    neoValue += ((flagsObject.carry     ? 0b00000001 : 0));
    return neoValue;
};

// CPU Enabled Action Function - handles clicks on the enabled switch
self.updateEnabled = (enabled) => {
    self.cpuData.cpuEnabled = enabled;
    self.clock.style.color = '#800000';
};

// CPU Speed Slider Action Function - handles changes to the CPU interval
self.updateSpeed = (interval) => {
    if (self.intervalHandle) {
        self.clearInterval(self.intervalHandle);
    }
    self.intervalHandle = self.setInterval(self.clockTick, parseInt(interval));
    self.cpuIntervalLabel.innerHTML = `CPU Interval: ${interval}ms`;
};

// Clock Tick - handles CPU clock tick action
self.clockTick = () => {
    if (self.cpuData.cpuEnabled) {
        if (self.cpuData.clockState == 1) {
            self.clock.style.color = '#FF0000';
            self.loaderRun();
            self.cpuData.clockState = 0;
        }
        else {
            self.clock.style.color = '#800000';
            self.cpuData.clockState = 1;
        }
    }
};

// set default CPU interval and updates speed with function call
const defaultIntervalValue = 1000;
self.cpuInterval.value = defaultIntervalValue;
self.updateSpeed(defaultIntervalValue);

// PRG On Change - sets the onchange event function handler
self.prg.onchange = () => {
    self.assembleCode();
};

// Assemble Code - direct function call to assemble the code into machine language
self.assembleCode();