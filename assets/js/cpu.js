// ╔══════════════════════════════════════════════════════════════════════════════════════╗
// ║                               javascript-cpu-simulator                               ║
// ╠══════════════════════════════════════════════════════════════════════════════════════╣
// ║                                                                                      ║
// ║         assets/js/cpu.js - the js brains behind it all, called by index.html         ║
// ║                                                                                      ║
// ║                        Copyright (c) 2019 - 2022 Mike Firoved                        ║
// ║                  MIT License. See ../../LICENSE and ../../README.md                  ║
// ║                                                                                      ║
// ╚══════════════════════════════════════════════════════════════════════════════════════╝

class CPU {

    constructor() {
        this.cpuData = {
            cpuEnabled: false,
            clockState: 0,
            memoryArray: [],
            programCounter: 0xFFFE,
            registers: {
                A: 0,
                X: 0,
                Y: 0,
                S: Math.floor(Math.random() * 256),   // stack pointer
            },
            flags: {
                negative:  false,
                overflow:  false,
                bFlagHigh: false,
                bFlagLow:  false,
                decimal:   false,
                interupt:  false,
                zero:      false,
                carry:     false,
            },
            assembler: {
                labels: {
                    labelLocations: {},
                    futureLabels:   {},
                },
                privatePointer: 0,
            }
        };        
    }

    // Clear and Initialize Memory - resets all memory locations 
    clearAndInitializeMemory(memorySize) {
        this.cpuData.memoryArray.length = 0;

        for (let i = 0; i < memorySize; i++) {
            this.cpuData.memoryArray.push(0xff);
        }
    }    

    //Convert Value to Flags -  bitwise convert flags from value to flags object
    convertValueToFlags(flagsValue) {
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
    }

    // Convert Flags to Value -  bitwise convert flags from flags object to value
    convertFlagsToValue(flagsObject) {
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
    }

    // Convert on Decimal Mode
    convertOnDecimalMode(number) {
        if(this.cpuData.flags.decimal){
            var strNumber   = number.toString(16).toUpperCase();
            var firstDigit  = strNumber.substr(0,1);
            var secondDigit = strNumber.substr(1,1);
            var returnValue = 0;
    
            if(/[0-9]/.test(firstDigit)){
                returnValue += (parseInt(firstDigit) * 10);
            }
            else {
                returnValue += (parseInt('0x' + firstDigit) * 10);
            }
            if(/[0-9]/.test(secondDigit)){
                returnValue += (parseInt(secondDigit) * 1);
            }
            else {
                returnValue += (parseInt('0x' + secondDigit) * 1);
            }
            return returnValue;
        }
        else {
            return number;
        }
    } 

    // CPU Enabled Action Function - handles clicks on the enabled switch
    updateEnabled(enabled) {
        this.cpuData.cpuEnabled = enabled;
        self.clock.style.color = '#800000';
    }

    // CPU Speed Slider Action Function - handles changes to the CPU interval
    updateSpeed(interval) {
        if (this.intervalHandle) {
            self.clearInterval(this.intervalHandle);
        }
        this.intervalHandle = self.setInterval(this.clockTick, parseInt(interval));
        self.cpuIntervalLabel.innerHTML = `CPU Interval: ${interval}ms`;
    }

    // Clock Tick - handles CPU clock tick action
    clockTick() {
        if (cpu.cpuData.cpuEnabled) {
            if (cpu.cpuData.clockState == 1) {
                self.clock.style.color = '#FF0000';
                cpu.loaderRun();
                cpu.cpuData.clockState = 0;
            }
            else {
                self.clock.style.color = '#800000';
                cpu.cpuData.clockState = 1;
            }
        }
    }    


    // Assemble Code - take the assembly language code and convert it into machine language
    assembleCode() {
        // halt cpu for assembly
        this.cpuData.cpuEnabled = self.cpuEnabled.checked = false;

        // clear existing memory
        this.clearAndInitializeMemory(65536);

        // clear assembler label locations
        this.cpuData.assembler.labels.labelLocations = {};
        this.cpuData.assembler.privatePointer = 0;

        // operand type 'constants'
        var operandTypes = {
            NULL: 0,
            IMMEDIATE: 1,
            ABSOLUTE: 2,
            RELATIVE: 3,
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
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt("0x" + byteValue.substr(1, 2));
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
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt("0x" + wordValue.substr(3, 2));
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt("0x" + wordValue.substr(1, 2));
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
                            var labelLocation = ("0000" + nextMemoryIndex.toString(16)).substr(-4, 4);

                            var labelLocationZero = labelLocation.substr(2, 2);
                            var labelLocationIchi = labelLocation.substr(0, 2);

                            this.cpuData.assembler.labels.labelLocations[labelName] = [labelLocationZero, labelLocationIchi];


                            // check for predeclaration label calls
                            if (labelName in this.cpuData.assembler.labels.futureLabels) {
                                // loop through memory to update
                                this.cpuData.assembler.labels.futureLabels[labelName].forEach(
                                    (futureLabel, idx) => {
                                        if(futureLabel.isRelative){
                                            var offset = nextMemoryIndex - futureLabel.operandLocationForOffset;
                                            offset += 256;      // handle negative numbers with two's compliment for negative offset
                                            offset &= 0xFF;     // for positive offset and with byte mask to get true offset
                                            this.cpuData.memoryArray[futureLabel.memLocationRelative] = offset;
                                        }
                                        else {
                                            this.cpuData.memoryArray[futureLabel.memLocationZero] = parseInt(`0x${labelLocationZero}`);
                                            this.cpuData.memoryArray[futureLabel.memLocationIchi] = parseInt(`0x${labelLocationIchi}`);
                                        }
                                    }
                                );

                                // after processing clear array
                                this.cpuData.assembler.labels.futureLabels[labelName] = [];
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
                                    if(operand.length == 3){
                                        operandType = operandTypes.RELATIVE;
                                        operandValue.push(parseInt(operand));
                                    }
                                    if(operand.length == 5){
                                        operandType = operandTypes.ABSOLUTE;
                                        operandValue.push(parseInt("0x" + operand.substr(3, 2)));
                                        operandValue.push(parseInt("0x" + operand.substr(1, 2)));
                                    }
                                }
                                else {
                                    if(/^(-[0-9]|[0-9])/.test(operand)){
                                        operandType = operandTypes.RELATIVE;
                                        operandValue.push(parseInt(operand));
                                    }
                                }
                            }

                            switch (operation) {
                                case 'ADC':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x69);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x6D);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;
                                case 'AND':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x29);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x2D);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'ASL':
                                    switch (operandType) {
                                        case operandTypes.NULL:
                                            // look for A
                                            if (operand.toUpperCase() == 'A') {
                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x0A);
                                                nextMemoryIndex++;
                                                this.cpuData.assembler.privatePointer++;
                                            }
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x0E);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'CLC':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x18);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'SEC':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x38);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'CLI':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x58);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'SEI':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x78);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'CLV':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xB8);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'CLD':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xD8);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'SED':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xF8);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'DEX':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xCA);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'DEY':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x88);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'INX':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xE8);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'INY':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xC8);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'JSR':
                                case 'JMP':
                                    var opcode = 0;
                                    switch (operation) {
                                        case 'JSR':
                                            opcode = parseInt(0x20);
                                            break;

                                        case 'JMP':
                                            opcode = parseInt(0x4C);
                                            break;
                                    }
                                    switch (operandType) {
                                        case operandTypes.NULL:
                                            // look for label
                                            if (operand in this.cpuData.assembler.labels.labelLocations) {
                                                this.cpuData.memoryArray[nextMemoryIndex] = opcode;
                                                nextMemoryIndex++;
                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt('0x' + this.cpuData.assembler.labels.labelLocations[operand][0]);
                                                nextMemoryIndex++;
                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt('0x' + this.cpuData.assembler.labels.labelLocations[operand][1]);
                                                nextMemoryIndex++;
                                                this.cpuData.assembler.privatePointer += 3;
                                            }
                                            else {
                                                // maybe label will be declared later
                                                var memLocationZero = 0;
                                                var memLocationIchi = 0;

                                                this.cpuData.memoryArray[nextMemoryIndex] = opcode;
                                                nextMemoryIndex++;

                                                this.cpuData.memoryArray[nextMemoryIndex] = 0;
                                                memLocationZero = nextMemoryIndex;
                                                nextMemoryIndex++;

                                                this.cpuData.memoryArray[nextMemoryIndex] = 0;
                                                memLocationIchi = nextMemoryIndex;
                                                nextMemoryIndex++;

                                                // if not in future labels yet, init it
                                                if (!(operand in this.cpuData.assembler.labels.futureLabels)) {
                                                    this.cpuData.assembler.labels.futureLabels[operand] = [];
                                                }
                                                this.cpuData.assembler.labels.futureLabels[operand].push(
                                                    {
                                                        isRelative: false,
                                                        memLocationZero,
                                                        memLocationIchi,
                                                        memLocationRelative: 0,
                                                        operandLocationForOffset: 0,
                                                    }
                                                );
                                            }
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = opcode;
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;
                                    }

                                    break;

                                case 'LDA':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA9);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAD);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'LDX':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA2);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAE);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'LDY':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA0);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAC);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'NOP':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xEA);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'STA':
                                    if (operandType == operandTypes.ABSOLUTE) {
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8D);
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        this.cpuData.assembler.privatePointer += 3;
                                    }
                                    break;

                                case 'STX':
                                    if (operandType == operandTypes.ABSOLUTE) {
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8E);
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        this.cpuData.assembler.privatePointer += 3;
                                    }
                                    break;

                                case 'STY':
                                    if (operandType == operandTypes.ABSOLUTE) {
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8C);
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                        nextMemoryIndex++;
                                        this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                        nextMemoryIndex++;
                                        this.cpuData.assembler.privatePointer += 3;
                                    }
                                    break;

                                case 'TAX':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xAA);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'TXA':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x8A);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'TAY':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xA8);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'TYA':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x98);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'TSX':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xBA);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'TXS':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x9A);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'RTS':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x60);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'PHA':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x48);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'PLA':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x68);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'PHP':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x08);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'PLP':
                                    this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x28);
                                    nextMemoryIndex++;
                                    this.cpuData.assembler.privatePointer++;
                                    break;

                                case 'EOR':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x49);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x4D);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;
                                    
                                case 'ORA':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x09);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x0D);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'LSR':
                                    switch (operandType) {
                                        case operandTypes.NULL:
                                            // look for A
                                            if (operand.toUpperCase() == 'A') {
                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x4A);
                                                nextMemoryIndex++;
                                                this.cpuData.assembler.privatePointer++;
                                            }
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x4E);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;           

                                case 'ROL':
                                    switch (operandType) {
                                        case operandTypes.NULL:
                                            // look for A
                                            if (operand.toUpperCase() == 'A') {
                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x2A);
                                                nextMemoryIndex++;
                                                this.cpuData.assembler.privatePointer++;
                                            }
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x2E);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;            

                                case 'ROR':
                                    switch (operandType) {
                                        case operandTypes.NULL:
                                            // look for A
                                            if (operand.toUpperCase() == 'A') {
                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x6A);
                                                nextMemoryIndex++;
                                                this.cpuData.assembler.privatePointer++;
                                            }
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x6E);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'SBC':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xE9);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xED);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'CMP':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xC9);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xCD);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;

                                case 'CPX':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xE0);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xEC);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;   

                                case 'CPY':
                                    switch (operandType) {
                                        case operandTypes.IMMEDIATE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xC0);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0xCC);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }
                                    break;                                                          

                                case "BIT":
                                    switch (operandType) {
                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(0x2C);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }                               
                                    break;
                                
                                case "BPL":
                                case "BMI":
                                case "BVC":
                                case "BVS":
                                case "BCC":
                                case "BCS":
                                case "BNE":
                                case "BEQ":
                                    var opcodes = {
                                        BPL: 0x10, BMI: 0x30, BVC: 0x50,
                                        BVS: 0x70, BCC: 0x90, BCS: 0xB0,
                                        BNE: 0xD0, BEQ: 0xF0,
                                    };
                                    var opcode = opcodes[operation];
                                    
                                    switch (operandType) {
                                        case operandTypes.NULL:
                                            // look for label, find offset for label
                                            if (operand in this.cpuData.assembler.labels.labelLocations) {
                                                // calculate offset to label location
                                                var offset = parseInt(`0x${this.cpuData.assembler.labels.labelLocations[operand][1]}${this.cpuData.assembler.labels.labelLocations[operand][0]}`) - nextMemoryIndex;
                                                offset += 256;      // handle negative numbers with two's compliment for negative offset
                                                offset &= 0xFF;     // for positive offset and with byte mask to get true offset   

                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt(opcode);
                                                nextMemoryIndex++;
                                                this.cpuData.memoryArray[nextMemoryIndex] = offset;
                                                nextMemoryIndex++;
                                                this.cpuData.assembler.privatePointer += 2;
                                            }
                                            else {
                                                // maybe label will be declared later
                                                var memLocationRelative      = 0;
                                                var operandLocationForOffset = 0;

                                                this.cpuData.memoryArray[nextMemoryIndex] = parseInt(opcode);
                                                operandLocationForOffset = nextMemoryIndex;
                                                nextMemoryIndex++;

                                                this.cpuData.memoryArray[nextMemoryIndex] = 0;
                                                memLocationRelative = nextMemoryIndex;
                                                nextMemoryIndex++;


                                                // if not in future labels yet, init it
                                                if (!(operand in this.cpuData.assembler.labels.futureLabels)) {
                                                    this.cpuData.assembler.labels.futureLabels[operand] = [];
                                                }
                                                this.cpuData.assembler.labels.futureLabels[operand].push(
                                                    {
                                                        isRelative: true,
                                                        memLocationZero: 0,
                                                        memLocationIchi: 0,
                                                        memLocationRelative,
                                                        operandLocationForOffset,
                                                    }
                                                );
                                            }                                
                                            break;      
                                            
                                        case operandTypes.RELATIVE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(opcode);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 2;
                                            break;

                                        case operandTypes.ABSOLUTE:
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(opcode);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[0]);
                                            nextMemoryIndex++;
                                            this.cpuData.memoryArray[nextMemoryIndex] = parseInt(operandValue[1]);
                                            nextMemoryIndex++;
                                            this.cpuData.assembler.privatePointer += 3;
                                            break;
                                    }


                                default:
                                    break;
                            }
                        }
                    }
                }


            }
        });

        this.writeMemory();

        // cpu enabled
        this.cpuData.cpuEnabled = self.cpuEnabled.checked = true;

    }



    // Write Memory - creates a visual representation of the cpu memory
    writeMemory() {
        var memText = ""

        this.cpuData.memoryArray.forEach(
            (memValue, memIndex) => {
                if (memIndex == 0 || ((memIndex / 8) == Math.floor(memIndex / 8))) {
                    if (memIndex != 0) { memText += "\n"; }
                    memText += ("0000" + memIndex.toString(16).toUpperCase()).substr(-4, 4);
                    memText += ":  ";
                }
                memText += ("00" + memValue.toString(16).toUpperCase()).substr(-2, 2);
                memText += "  ";
            }
        );
        self.mem.value = memText;
        memText = null;

        var fmtRegA  = '$' + ('00' + this.cpuData.registers.A.toString(16).toUpperCase()).substr(-2, 2);
        var fmtRegX  = '$' + ('00' + this.cpuData.registers.X.toString(16).toUpperCase()).substr(-2, 2);
        var fmtRegY  = '$' + ('00' + this.cpuData.registers.Y.toString(16).toUpperCase()).substr(-2, 2);
        var fmtRegS  = '$' + ('00' + this.cpuData.registers.S.toString(16).toUpperCase()).substr(-2, 2);

        self.registers.innerHTML = `Registers:<br />A: ${fmtRegA}&nbsp;&nbsp;X: ${fmtRegX}&nbsp;&nbsp;Y: ${fmtRegY}&nbsp;&nbsp;SP: ${fmtRegS}`;

        var fmtFlags = '';
        fmtFlags += `NEG:&nbsp;${this.cpuData.flags.negative ? '1' : '0'}&nbsp;`;
        fmtFlags += `OVR:&nbsp;${this.cpuData.flags.overflow ? '1' : '0'}&nbsp;`;
        fmtFlags += `DEC:&nbsp;${this.cpuData.flags.decimal ? '1' : '0'}&nbsp;`;
        fmtFlags += `INT:&nbsp;${this.cpuData.flags.interupt ? '1' : '0'}&nbsp;`;
        fmtFlags += `ZER:&nbsp;${this.cpuData.flags.zero ? '1' : '0'}&nbsp;`;
        fmtFlags += `CAR:&nbsp;${this.cpuData.flags.carry ? '1' : '0'}&nbsp;`;


        self.flags.innerHTML = `Flags:<br />${fmtFlags}`;
    }

        
    // Loader Run - executes the machine language code
    loaderRun() {

        if (this.cpuData.programCounter == 0xFFFE) {
            // get word to find origin
            this.cpuData.programCounter = parseInt('0x' + this.cpuData.memoryArray[0xFFFF].toString(16).toUpperCase() + this.cpuData.memoryArray[0xFFFE].toString(16).toUpperCase());
        }

        var operation = this.cpuData.memoryArray[this.cpuData.programCounter];
        var opPlusOne = this.cpuData.memoryArray[this.cpuData.programCounter + 1] || 0;
        var opPlusTwo = this.cpuData.memoryArray[this.cpuData.programCounter + 2] || 0;
        var oneAndTwo = parseInt('0x' + opPlusTwo.toString(16) + opPlusOne.toString(16));
        var memoryVal = this.cpuData.memoryArray[oneAndTwo];

        var fmtAddress = '0x' + ('0000' + oneAndTwo.toString(16).toUpperCase()).substr(-4, 4);
        var fmtImValue = '0x' + ('0000' + opPlusOne.toString(16).toUpperCase()).substr(-2, 2);
        var fmtCounter = '$'  + ('0000' + this.cpuData.programCounter.toString(16).toUpperCase()).substr(-4, 4);
        var currentPfx = `Current Operation: ${fmtCounter}&nbsp;`;

        switch (operation) {
            case 0x69:
                // ADC immediate 
                self.loader.innerHTML = `${currentPfx} ADC ${fmtImValue}`;
                var sum = this.cpuData.registers.A + this.convertOnDecimalMode(opPlusOne) + (this.cpuData.flags.carry ? 1 : 0);
                this.cpuData.flags.carry = false;
                if(sum > 0xFF){
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.flags.overflow = (!((opPlusOne ^ this.cpuData.registers.A) & 0x80));
                this.cpuData.registers.A = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0x6D:
                // ADC absolute
                self.loader.innerHTML = `${currentPfx} ADC ${oneAndTwo}`;
                var sum = this.cpuData.registers.A + this.convertOnDecimalMode(memoryVal) + (this.cpuData.flags.carry ? 1 : 0);
                this.cpuData.flags.carry = false;
                if(sum > 0xFF){
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.registers.A = sum;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.flags.overflow = (!((memoryVal ^ this.cpuData.registers.A) & 0x80));
                this.cpuData.programCounter += 3;
                break;

            case 0xE9:
                // SBC immediate 
                self.loader.innerHTML = `${currentPfx} SBC ${fmtImValue}`;
                var sum = this.cpuData.registers.A - this.convertOnDecimalMode(opPlusOne) - (this.cpuData.flags.carry ? 0 : 1);
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.flags.overflow = (!((opPlusOne ^ this.cpuData.registers.A) & 0x80));
                this.cpuData.registers.A = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0xED:
                // SBC absolute
                self.loader.innerHTML = `${currentPfx} SBC ${oneAndTwo}`;
                var sum = this.cpuData.registers.A - this.convertOnDecimalMode(memoryVal) - (this.cpuData.flags.carry ? 0 : 1);
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.registers.A = sum;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.flags.overflow = (!((memoryVal ^ this.cpuData.registers.A) & 0x80));
                this.cpuData.programCounter += 3;
                break;        

            case 0x29:
                // AND immediate 
                self.loader.innerHTML = `${currentPfx} AND ${fmtImValue}`;
                var sum = this.cpuData.registers.A & opPlusOne;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0x2D:
                // AND absolute
                self.loader.innerHTML = `${currentPfx} AND ${oneAndTwo}`;
                var sum = this.cpuData.registers.A & memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;            
                this.cpuData.programCounter += 3;
                break;


            case 0x0A:
                // ASL A
                self.loader.innerHTML = `${currentPfx} ASL A`;
                var sum = this.cpuData.registers.A << 1;
                this.cpuData.flags.carry = false;
                if(sum > 0xFF){
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0x0E:
                // ASL absolute
                self.loader.innerHTML = `${currentPfx} ASL ${fmtAddress}`;
                var sum = this.cpuData.memoryArray[oneAndTwo] << 1;
                this.cpuData.flags.carry = false;
                if(sum > 0xFF){
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.memoryArray[oneAndTwo] = sum;            
                this.cpuData.programCounter += 3;
                break;

            case 0xCA:
                // DEX
                self.loader.innerHTML = `${currentPfx} DEX`;
                var sum = this.cpuData.registers.X - 1;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.X = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0x88:
                // DEY 
                self.loader.innerHTML = `${currentPfx} DEY`;
                var sum = this.cpuData.registers.Y - 1;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.Y    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0xE8:
                // INX
                self.loader.innerHTML = `${currentPfx} INX`;
                var sum = this.cpuData.registers.X + 1;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.X    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0xC8:
                // INY
                self.loader.innerHTML = `${currentPfx} INY`;
                var sum = this.cpuData.registers.Y + 1;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.Y    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0x4C:
                // JMP 
                self.loader.innerHTML = `${currentPfx} JMP to ${fmtAddress}`;
                this.cpuData.programCounter = oneAndTwo;
                break;

            case 0x20:
                // JSR
                self.loader.innerHTML = `${currentPfx} JSR to ${fmtAddress}`;
                this.cpuData.memoryArray[0x100 + this.cpuData.registers.S] = this.cpuData.programCounter;
                this.cpuData.registers.S--;
                this.cpuData.programCounter = oneAndTwo;
                break;

            case 0x60:
                // RTS
                var addr = this.cpuData.memoryArray[0x101 + this.cpuData.registers.S] + 3;
                self.loader.innerHTML = `${currentPfx} RTS to ${'0x' + ('0000' + addr.toString(16).toUpperCase()).substr(-4, 4)}`;
                this.cpuData.programCounter = addr
                this.cpuData.registers.S++;
                break;

            case 0xA9:
                // LDA immediate
                self.loader.innerHTML = `${currentPfx} LDA ${fmtImValue}`;
                var sum = opPlusOne;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0xAD:
                // LDA absolute
                self.loader.innerHTML = `${currentPfx} LDA ${fmtAddress}`;
                var sum = memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 3;
                break;

            case 0xA2:
                // LDX immediate
                self.loader.innerHTML = `${currentPfx} LDX ${fmtImValue}`;
                var sum = opPlusOne;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.X    = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0xAE:
                // LDX absolute
                self.loader.innerHTML = `${currentPfx} LDX ${fmtAddress}`;
                var sum = memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.x    = sum;
                this.cpuData.programCounter += 3;
                break;

            case 0xA0:
                // LDY immediate
                self.loader.innerHTML = `${currentPfx} LDY ${fmtImValue}`;
                var sum = opPlusOne;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.Y    = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0xAC:
                // LDY absolute
                self.loader.innerHTML = `${currentPfx} LDY ${fmtAddress}`;
                var sum = memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.Y    = sum;            
                this.cpuData.programCounter += 3;
                break;

            case 0xEA:
                // NOP
                self.loader.innerHTML = `${currentPfx} NOP`;
                this.cpuData.programCounter += 1;
                break;

            case 0x8D:
                // STA
                self.loader.innerHTML = `${currentPfx} STA ${fmtAddress}`;
                this.cpuData.memoryArray[oneAndTwo] = this.cpuData.registers.A;
                this.cpuData.programCounter += 3;
                break;

            case 0x8E:
                // STX
                self.loader.innerHTML = `${currentPfx} STX ${fmtAddress}`;
                this.cpuData.memoryArray[oneAndTwo] = this.cpuData.registers.X;
                this.cpuData.programCounter += 3;
                break;

            case 0x8C:
                // STY
                self.loader.innerHTML = `${currentPfx} STY ${fmtAddress}`;
                this.cpuData.memoryArray[oneAndTwo] = this.cpuData.registers.Y;
                this.cpuData.programCounter += 3;
                break;

            case 0xAA:
                // TAX
                self.loader.innerHTML = `${currentPfx} TAX`;
                var sum = this.cpuData.registers.A;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.X    = sum;            
                this.cpuData.programCounter += 1;
                break;

            case 0x8A:
                // TXA
                self.loader.innerHTML = `${currentPfx} TXA`;
                var sum = this.cpuData.registers.X;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;            
                this.cpuData.programCounter += 1;
                break;

            case 0xA8:
                // TAY
                self.loader.innerHTML = `${currentPfx} TAY`;
                var sum = this.cpuData.registers.A;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.Y    = sum;                
                this.cpuData.programCounter += 1;
                break;

            case 0x98:
                // TYA
                self.loader.innerHTML = `${currentPfx} TYA`;
                var sum = this.cpuData.registers.Y;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;               
                this.cpuData.programCounter += 1;
                break;


            case 0x18:
                // CLC
                self.loader.innerHTML = `${currentPfx} CLC`;
                this.cpuData.flags.carry = false;
                this.cpuData.programCounter += 1;
                break;


            case 0x38:
                // SEC
                self.loader.innerHTML = `${currentPfx} SEC`;
                this.cpuData.flags.carry = true;
                this.cpuData.programCounter += 1;
                break;


            case 0x58:
                // CLI
                self.loader.innerHTML = `${currentPfx} CLI`;
                this.cpuData.flags.interupt = false;
                this.cpuData.programCounter += 1;
                break;


            case 0x78:
                // SEI
                self.loader.innerHTML = `${currentPfx} SEI`;
                this.cpuData.flags.interupt = true;
                this.cpuData.programCounter += 1;
                break;


            case 0xB8:
                // CLV
                self.loader.innerHTML = `${currentPfx} CLV`;
                this.cpuData.flags.overflow = false;
                this.cpuData.programCounter += 1;
                break;


            case 0xD8:
                // CLD
                self.loader.innerHTML = `${currentPfx} CLD`;
                this.cpuData.flags.decimal = false;
                this.cpuData.programCounter += 1;
                break;


            case 0xF8:
                // SED
                self.loader.innerHTML = `${currentPfx} SED`;
                this.cpuData.flags.decimal = true;
                this.cpuData.programCounter += 1;
                break;

            case 0x9A:
                // TXS
                self.loader.innerHTML = `${currentPfx} TXS`;
                var sum = this.cpuData.registers.X;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.S    = sum;                
                this.cpuData.programCounter += 1;
                break;

            case 0xBA:
                // TSX
                self.loader.innerHTML = `${currentPfx} TSX`;
                var sum = this.cpuData.registers.S;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.X    = sum;               
                this.cpuData.programCounter += 1;
                break;

            case 0x48:
                // PHA
                self.loader.innerHTML = `${currentPfx} PHA`;
                this.cpuData.memoryArray[0x100 + this.cpuData.registers.S] = this.cpuData.registers.A;
                this.cpuData.registers.S--;
                this.cpuData.programCounter += 1;
                break;

            case 0x68:
                // PLA
                self.loader.innerHTML = `${currentPfx} PLA`;
                this.cpuData.registers.S++;
                this.cpuData.registers.A = this.cpuData.memoryArray[0x100 + this.cpuData.registers.S];
                this.cpuData.programCounter += 1;
                break;

            case 0x08:
                // PHP
                self.loader.innerHTML = `${currentPfx} PHP`;
                var processorStatus = this.convertFlagsToValue(this.cpuData.flags);
                processorStatus.bFlagHigh = true;
                processorStatus.bFlagLow  = true;
                this.cpuData.memoryArray[0x100 + this.cpuData.registers.S] = processorStatus;
                this.cpuData.registers.S--;
                this.cpuData.programCounter += 1;
                break;

            case 0x28:
                // PLP
                self.loader.innerHTML = `${currentPfx} PLP`;
                this.cpuData.registers.S++;
                var processorStatus = this.cpuData.memoryArray[0x100 + this.cpuData.registers.S];
                this.cpuData.flags  = this.convertValueToFlags(processorStatus);
                this.cpuData.programCounter += 1;
                break;

            case 0x49:
                // EOR immediate 
                self.loader.innerHTML = `${currentPfx} EOR ${fmtImValue}`;
                var sum = this.cpuData.registers.A ^ opPlusOne;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0x4D:
                // EOR absolute
                self.loader.innerHTML = `${currentPfx} EOR ${oneAndTwo}`;
                var sum = this.cpuData.registers.A ^ memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;            
                this.cpuData.programCounter += 3;
                break;

            case 0x09:
                // ORA immediate 
                self.loader.innerHTML = `${currentPfx} ORA ${fmtImValue}`;
                var sum = this.cpuData.registers.A | opPlusOne;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 2;
                break;

            case 0x0D:
                // ORA absolute
                self.loader.innerHTML = `${currentPfx} ORA ${oneAndTwo}`;
                var sum = this.cpuData.registers.A | memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;            
                this.cpuData.programCounter += 3;
                break;

            case 0x4A:
                // LSR A
                self.loader.innerHTML = `${currentPfx} LSR A`;
                var bit0 = this.cpuData.registers.A & 0x01; 
                var sum  = this.cpuData.registers.A >> 1;
                this.cpuData.flags.carry    = (bit0 == 1);
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0x4E:
                // LSR absolute
                self.loader.innerHTML = `${currentPfx} LSR ${fmtAddress}`;
                var bit0 = this.cpuData.memoryArray[oneAndTwo] & 0x01; 
                var sum  = this.cpuData.memoryArray[oneAndTwo] >> 1;
                this.cpuData.flags.carry    = (bit0 == 1);
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.memoryArray[oneAndTwo] = sum;            
                this.cpuData.programCounter += 3;
                break;

            case 0x2A:
                // ROL A
                self.loader.innerHTML = `${currentPfx} ROL A`;
                var bit7 = this.cpuData.registers.A & 0x80; 
                var sum  = (this.cpuData.registers.A << 1) | (this.cpuData.flags.carry ? 1 : 0);
                this.cpuData.flags.carry    = (bit7 == 1);
                this.cpuData.flags.zero     = (sum  == 0);
                this.cpuData.flags.negative = (sum  > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0x2E:
                // ROL absolute
                self.loader.innerHTML = `${currentPfx} ROL ${fmtAddress}`;
                var bit7 = this.cpuData.memoryArray[oneAndTwo] & 0x80;
                var sum  = (this.cpuData.memoryArray[oneAndTwo] << 1) | (this.cpuData.flags.carry ? 0x01 : 0x00);
                this.cpuData.flags.carry    = (bit7 == 1);
                this.cpuData.flags.zero     = (sum  == 0);
                this.cpuData.flags.negative = (sum  > 0x7F);
                this.cpuData.memoryArray[oneAndTwo] = sum;            
                this.cpuData.programCounter += 3;
                break;			

            case 0x6A:
                // ROR A
                self.loader.innerHTML = `${currentPfx} ROR A`;
                var bit0 = this.cpuData.registers.A & 0x01; 
                var sum  = (this.cpuData.registers.A >> 1) | (this.cpuData.flags.carry ? 0x80 : 0x00);
                this.cpuData.flags.carry    = (bit0 == 1);
                this.cpuData.flags.zero     = (sum  == 0);
                this.cpuData.flags.negative = (sum  > 0x7F);
                this.cpuData.registers.A    = sum;
                this.cpuData.programCounter += 1;
                break;

            case 0x6E:
                // ROR absolute
                self.loader.innerHTML = `${currentPfx} ROR ${fmtAddress}`;
                var bit0 = this.cpuData.memoryArray[oneAndTwo] & 0x01;
                var sum  = (this.cpuData.memoryArray[oneAndTwo] >> 1) | (this.cpuData.flags.carry ? 0x80 : 0x00);
                this.cpuData.flags.carry    = (bit0 == 1);
                this.cpuData.flags.zero     = (sum  == 0);
                this.cpuData.flags.negative = (sum  > 0x7F);
                this.cpuData.memoryArray[oneAndTwo] = sum;            
                this.cpuData.programCounter += 3;
                break;	


            case 0x10:
                // BPL 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BPL offset ${offset}`;
                if(!this.cpuData.flags.negative){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0x30:
                // BMI 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BMI offset ${offset}`;
                if(this.cpuData.flags.negative){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0x50:
                // BVC 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BVC offset ${offset}`;
                if(!this.cpuData.flags.overflow){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0x70:
                // BVS 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BVS offset ${offset}`;
                if(this.cpuData.flags.overflow){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0x90:
                // BCC 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BCC offset ${offset}`;
                if(!this.cpuData.flags.carry){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0xB0:
                // BCS 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BCS offset ${offset}`;
                if(this.cpuData.flags.carry){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0xD0:
                // BNE 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BNE offset ${offset}`;
                if(!this.cpuData.flags.zero){
                    this.cpuData.programCounter += offset;
                }          
                break;


            case 0xF0:
                // BEQ 
                var offset = parseInt(opPlusOne);
                if(offset & 0x80) { offset -= 256; }
                self.loader.innerHTML = `${currentPfx} BEQ offset ${offset}`;
                if(this.cpuData.flags.zero){
                    this.cpuData.programCounter += offset;
                }          
                break;

            case 0x2C:
                // BIT absolute
                self.loader.innerHTML = `${currentPfx} BIT ${fmtAddress}`;
                var sum = this.cpuData.registers.A & memoryVal;
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (memoryVal & 0x80) > 0;
                this.cpuData.flags.overflow = (memoryVal & 0x40) > 0;
                this.cpuData.programCounter += 3;
                break;

            case 0xC9:
                // CMP immediate 
                self.loader.innerHTML = `${currentPfx} CMP ${fmtImValue}`;
                var sum = this.cpuData.registers.A - opPlusOne;
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.programCounter += 2;
                break;

            case 0xCD:
                // CMP absolute
                self.loader.innerHTML = `${currentPfx} CMP ${oneAndTwo}`;
                var sum = this.cpuData.registers.A - memoryVal;
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.programCounter += 3;
                break;    

            case 0xE0:
                // CPX immediate 
                self.loader.innerHTML = `${currentPfx} CPX ${fmtImValue}`;
                var sum = this.cpuData.registers.X - opPlusOne;
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.programCounter += 2;
                break;

            case 0xEC:
                // CPX absolute
                self.loader.innerHTML = `${currentPfx} CPX ${oneAndTwo}`;
                var sum = this.cpuData.registers.X - memoryVal;
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.programCounter += 3;
                break;    

            case 0xE9:
                // CPY immediate 
                self.loader.innerHTML = `${currentPfx} CPY ${fmtImValue}`;
                var sum = this.cpuData.registers.Y - opPlusOne;
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.programCounter += 2;
                break;

            case 0xED:
                // CPY absolute
                self.loader.innerHTML = `${currentPfx} CPY ${oneAndTwo}`;
                var sum = this.cpuData.registers.Y - memoryVal;
                this.cpuData.flags.carry = false;
                if(sum < 0){
                    sum += 256;
                    sum &= 0xFF;
                    this.cpuData.flags.carry = true;
                }
                this.cpuData.flags.zero     = (sum == 0);
                this.cpuData.flags.negative = (sum > 0x7F);
                this.cpuData.programCounter += 3;
                break;    			            

            default:
                break;
        }

        this.writeMemory();

        if (this.cpuData.programCounter >= this.cpuData.memoryArray.length) { this.cpuData.programCounter = 0xFFFE; }
    }

}


let cpu = new CPU()

















// put sample code program into assembly
self.prg.value = `
; sample program for 6502

.org $FFFE
.word $0003
    
.org $0003

start:
    LDX #$FF
    TXS
    SEC
    CLC
    LDA #$00
    STA $0040
    JSR clearAll
    ADC #$1E
    LDA #$04
    ASL A
    STA $0041
    LDA #$40
    STA $0050
    LDA $0050
    SBC #$20
    LDA #$FF
    CMP #$88

addLoop:
    LDA $0040
    TAX
    INX
    TXA
    STA $0040
    BIT $0040
    JMP addLoop

clearAll:
    CLC
    CLD
    CLV
    LDA #$00
    LDX #$00
    LDY #$00
    RTS

.org $0040
.byte $00
`;


// set default CPU interval and updates speed with function call
const defaultIntervalValue = 1000;
self.cpuInterval.value = defaultIntervalValue;
cpu.updateSpeed(defaultIntervalValue);

// set dynamic content
const dateCurrent = new Date();
const dateUpdated = new Date(self.DateUpdated.innerHTML);
self.currentYear.innerHTML = dateCurrent.getFullYear();
self.DateUpdated.innerHTML = dateUpdated.toLocaleString().replace(',', '');
if(!(dateUpdated instanceof Date && isFinite(dateUpdated))) {
    self.DateUpdated.innerHTML = "unknown";
}

// PRG On Change - sets the onchange event function handler
self.prg.onchange = () => {
    cpu.cpuData.cpuEnabled     = false;
    cpu.cpuData.programCounter = 0xFFFE;

    cpu.assembleCode();
};

// Assemble Code - direct function call to assemble the code into machine language
cpu.assembleCode();