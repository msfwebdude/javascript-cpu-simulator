// script source for index.html

self.prg.value = "start:\n\tLDA #$00\n\tSTA $0018\n\tADC #$1E\naddLoop:\n\tLDA $0018\n\tTAX\n\tINX\n\tTXA\n\tSTA $0018\n\tJMP addLoop\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP\n\tNOP";
self.cpuData = {
    clockState: 0,
    memoryArray: [],
    interuptStack: [0],
    programCounter: 0,
    registers: {
        A: 0,
        X: 0,
        Y: 0,
    },
    assembler: {
        labelLocations: {}
    }
};


// cpu functions
self.assembleCode = () => {
    // clear existing memory
    self.cpuData.memoryArray.length = 0;

    // clear assembler label locations
    self.cpuData.assembler.labelLocations = {};

    // operand type 'constants'
    var operandTypes = {
        NULL: 0,
        IMMEDIATE: 1,
        ABSOLUTE: 2,
    };

    // iterate through program
    var lines = self.prg.value.replace(/\r\n/g, "\n").split("\n");
    lines.forEach(line => {
        console.log(line);
        if (line.trim() != "") {
            // check for comment
            if (!line.trim().startsWith(';')) {
                // check for label
                if (line.trim().endsWith(':')) {
                    var labelName = line.trim().replace(':', '');
                    var labelLocation = ("0000" + self.cpuData.memoryArray.length).substr(-4, 4);
                    console.log(self.cpuData.memoryArray);
                    self.cpuData.assembler.labelLocations[labelName] = [];
                    self.cpuData.assembler.labelLocations[labelName].push(labelLocation.substr(2, 2));
                    self.cpuData.assembler.labelLocations[labelName].push(labelLocation.substr(0, 2));
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

                    switch (operation) {
                        case 'ADC':
                            switch (operandType) {
                                case operandTypes.IMMEDIATE:
                                    self.cpuData.memoryArray.push(0x69);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    break;

                                case operandTypes.ABSOLUTE:
                                    self.cpuData.memoryArray.push(0x6D);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    self.cpuData.memoryArray.push(operandValue[1]);
                                    break;
                            }
                            break;

                        case 'DEX':
                            self.cpuData.memoryArray.push(0xCA);

                        case 'DEY':
                            self.cpuData.memoryArray.push(0x88);
                            break;

                        case 'INX':
                            self.cpuData.memoryArray.push(0xE8);
                            break;

                        case 'INY':
                            self.cpuData.memoryArray.push(0xC8);
                            break;

                        case 'JMP':
                            switch (operandType) {
                                case operandTypes.NULL:
                                    // look for label
                                    if (operand in self.cpuData.assembler.labelLocations) {
                                        self.cpuData.memoryArray.push(0x4C);
                                        self.cpuData.memoryArray.push(self.cpuData.assembler.labelLocations[operand][0]);
                                        self.cpuData.memoryArray.push(self.cpuData.assembler.labelLocations[operand][1]);
                                    }
                                    break;

                                case operandTypes.ABSOLUTE:
                                    self.cpuData.memoryArray.push(0x4C);
                                    self.cpuData.memoryArray.push(operandValue);
                                    break;
                            }

                            break;

                        case 'LDA':
                            switch (operandType) {
                                case operandTypes.IMMEDIATE:
                                    self.cpuData.memoryArray.push(0xA9);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    break;

                                case operandTypes.ABSOLUTE:
                                    self.cpuData.memoryArray.push(0xAD);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    self.cpuData.memoryArray.push(operandValue[1]);
                                    break;
                            }
                            break;

                        case 'LDX':
                            switch (operandType) {
                                case operandTypes.IMMEDIATE:
                                    self.cpuData.memoryArray.push(0xA2);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    break;

                                case operandTypes.ABSOLUTE:
                                    self.cpuData.memoryArray.push(0xAE);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    self.cpuData.memoryArray.push(operandValue[1]);
                                    break;
                            }
                            break;

                        case 'LDY':
                            switch (operandType) {
                                case operandTypes.IMMEDIATE:
                                    self.cpuData.memoryArray.push(0xA0);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    break;

                                case operandTypes.ABSOLUTE:
                                    self.cpuData.memoryArray.push(0xAC);
                                    self.cpuData.memoryArray.push(operandValue[0]);
                                    self.cpuData.memoryArray.push(operandValue[1]);
                                    break;
                            }
                            break;

                        case 'NOP':
                            self.cpuData.memoryArray.push(0xEA);
                            break;

                        case 'STA':
                            if (operandType == operandTypes.ABSOLUTE) {
                                self.cpuData.memoryArray.push(0x8D);
                                self.cpuData.memoryArray.push(operandValue[0]);
                                self.cpuData.memoryArray.push(operandValue[1]);
                            }
                            break;

                        case 'STX':
                            if (operandType == operandTypes.ABSOLUTE) {
                                self.cpuData.memoryArray.push(0x8E);
                                self.cpuData.memoryArray.push(operandValue[0]);
                                self.cpuData.memoryArray.push(operandValue[1]);
                            }
                            break;

                        case 'STY':
                            if (operandType == operandTypes.ABSOLUTE) {
                                self.cpuData.memoryArray.push(0x8C);
                                self.cpuData.memoryArray.push(operandValue[0]);
                                self.cpuData.memoryArray.push(operandValue[1]);
                            }
                            break;

                        case 'TAX':
                            self.cpuData.memoryArray.push(0xAA);
                            break;

                        case 'TXA':
                            self.cpuData.memoryArray.push(0x8A);
                            break;

                        case 'TAY':
                            self.cpuData.memoryArray.push(0xA8);
                            break;

                        case 'TYA':
                            self.cpuData.memoryArray.push(0x98);
                            break;

                        default:
                            break;
                    }
                }
            }
        }
    });


};

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

    self.registers.innerHTML = `Registers&nbsp;&nbsp;[A: 0x${self.cpuData.registers.A.toString(16).toUpperCase()}]&nbsp;&nbsp;[X: 0x${self.cpuData.registers.X.toString(16).toUpperCase()}]&nbsp;&nbsp;[Y: 0x${self.cpuData.registers.Y.toString(16).toUpperCase()}]`;
};

self.loaderRun = () => {


    var operation = self.cpuData.memoryArray[self.cpuData.programCounter];
    var opPlusOne = self.cpuData.memoryArray[self.cpuData.programCounter + 1];
    var opPlusTwo = self.cpuData.memoryArray[self.cpuData.programCounter + 2];
    var oneAndTwo = parseInt('0x' + opPlusTwo.toString(16) + opPlusOne.toString(16));

    self.loader.innerHTML = `Current Operation: 0x${operation.toString(16).toUpperCase()}`;

    switch (operation) {
        case 0x69:
            // ADC immediate
            cpuData.registers.A = cpuData.registers.A + opPlusOne;
            self.cpuData.programCounter += 2;
            break;

        case 0x6D:
            // ADC absolute
            cpuData.registers.A = cpuData.registers.A + oneAndTwo;
            self.cpuData.programCounter += 3;
            break;


        case 0xCA:
            // DEX
            self.cpuData.registers.X--;
            self.cpuData.programCounter += 1;
            break;

        case 0x88:
            // DEY 
            self.cpuData.registers.Y--;
            self.cpuData.programCounter += 1;
            break;

        case 0xE8:
            // INX
            self.cpuData.registers.X++;
            self.cpuData.programCounter += 1;
            break;

        case 0xC8:
            // INY
            self.cpuData.registers.Y++;
            self.cpuData.programCounter += 1;
            break;

        case 0x4C:
            // JMP 
            self.cpuData.programCounter = oneAndTwo;
            break;

        case 0xA9:
            // LDA immediate
            cpuData.registers.A = opPlusOne;
            self.cpuData.programCounter += 2;
            break;

        case 0xAD:
            // LDA absolute
            cpuData.registers.A = oneAndTwo;
            self.cpuData.programCounter += 3;
            break;

        case 0xA2:
            // LDX immediate
            cpuData.registers.X = opPlusOne;
            self.cpuData.programCounter += 2;
            break;

        case 0xAE:
            // LDX absolute
            cpuData.registers.X = oneAndTwo;
            self.cpuData.programCounter += 3;
            break;

        case 0xA0:
            // LDY immediate
            cpuData.registers.Y = opPlusOne;
            self.cpuData.programCounter += 2;
            break;

        case 0xAC:
            // LDY absolute
            cpuData.registers.Y = oneAndTwo;
            self.cpuData.programCounter += 3;
            break;

        case 0xEA:
            // NOP
            self.cpuData.programCounter += 1;
            break;

        case 0x8D:
            // STA
            self.cpuData.memoryArray[oneAndTwo] = self.cpuData.registers.A;
            self.cpuData.programCounter += 3;
            break;

        case 0x8E:
            // STX
            self.cpuData.memoryArray[oneAndTwo] = self.cpuData.registers.X;
            self.cpuData.programCounter += 3;
            break;

        case 0x8C:
            // STY
            self.cpuData.memoryArray[oneAndTwo] = self.cpuData.registers.Y;
            self.cpuData.programCounter += 3;
            break;

        case 0xAA:
            // TAX
            self.cpuData.registers.X = cpuData.registers.A;
            self.cpuData.programCounter += 1;
            break;

        case 0x8A:
            // TXA
            self.cpuData.registers.A = cpuData.registers.X;
            self.cpuData.programCounter += 1;
            break;

        case 0xA8:
            // TAY
            self.cpuData.registers.Y = cpuData.registers.A;
            self.cpuData.programCounter += 1;
            break;

        case 0x98:
            // TYA
            self.cpuData.registers.A = cpuData.registers.Y;
            self.cpuData.programCounter += 1;
            break;

        default:
            break;
    }

    self.writeMemory();

    self.cpuData.programCounter++;
    if (self.cpuData.programCounter >= self.cpuData.memoryArray.length) { self.cpuData.programCounter = 0; }
};
self.clockTick = () => {
    if (self.cpuData.clockState == 1) {
        self.clock.style.color = '#FF0000';
        self.loaderRun();
        self.cpuData.clockState = 0;
    }
    else {
        self.clock.style.color = '#800000';
        self.cpuData.clockState = 1;
    }
};

// set interval
self.intervalHandle = self.setInterval(self.clockTick, 1000);

// events
self.prg.onchange = () => {
    self.assembleCode();
};
self.assembleCode();