    // script source for index.html

    self.mem.value = "LDA $7\nTAX\nINX\nTXA\nSTA $7\nJMP $0\nNOP\n0";
    self.cpuData = {
        clockState:  0,
        memoryArray: [],
        interuptStack: [0],
        programCounter: 0,
        registers: {
            A: 0,
            X: 0,
            Y: 0,
        },
    };
    self.readMemory = () => {
        self.cpuData.memoryArray.length = 0;
        var lines = self.mem.value.replace(/\r\n/g,"\n").split("\n");
        lines.forEach(line => {
            if(line.trim() != ""){ self.cpuData.memoryArray.push(line); }
        });                
    };
    self.writeMemory = () => {
        self.mem.value = self.cpuData.memoryArray.join("\n");
        self.registers.innerHTML = `Registers&nbsp;&nbsp;[A: ${self.cpuData.registers.A}]&nbsp;&nbsp;[X: ${self.cpuData.registers.X}]&nbsp;&nbsp;[Y: ${self.cpuData.registers.Y}]`;
    };
    self.loaderRun = () => {
        var operandTypes = {
            NULL:      0,
            IMMEDIATE: 1,
            ABSOLUTE:  2,
        };

        self.readMemory();

        var curInstruction  = self.cpuData.memoryArray[self.cpuData.programCounter];
        var curInstrParts   = curInstruction.split(' ');
        var operation       = curInstrParts[0];
        var formattedValue  = '';
        var operandValue    = 0;
        var operandLocation = 0;
        var operandType     = 0;

        if(curInstrParts.length > 1){
            formattedValue = curInstrParts[1];

            if(formattedValue.startsWith('#')){
                operandType  = operandTypes.IMMEDIATE;
                operandValue = parseInt(formattedValue.substr(1)); 
            }
            if(formattedValue.startsWith('$')){
                operandType     = operandTypes.ABSOLUTE;
                operandValue    = self.cpuData.memoryArray[parseInt(formattedValue.substr(1))];
                operandLocation = parseInt(formattedValue.substr(1));
            }
        }

        self.loader.innerHTML = `Current Operation: ${curInstruction}`;
                    
        self.cpuData.loaderInfo = {
            operandValue,
            operandLocation,
            operandType,
        };
        console.log(self.cpuData); 

        switch (operation.toUpperCase()) {
            case 'ADC':
                cpuData.registers.A = parseInt(cpuData.registers.A) + parseInt(operandValue);
                break;

            case 'DEX':
                self.cpuData.registers.X--;
                break;

            case 'DEY':
                self.cpuData.registers.Y--;
                break;

            case 'INX':
                self.cpuData.registers.X++;
                break;

            case 'INY':
                self.cpuData.registers.Y++;
                break;

            case 'JMP':
                self.cpuData.programCounter = parseInt(operandLocation);
                self.writeMemory();
                return;
                break; 

            case 'LDA':
                cpuData.registers.A =  parseInt(operandValue);
                break;

            case 'LDX':
                cpuData.registers.X =  parseInt(operandValue);
                break;

            case 'LDY':
                cpuData.registers.Y =  parseInt(operandValue);
                break;               

            case 'NOP':
                // do nothing
                break;

            case 'STA':
                self.cpuData.memoryArray[operandLocation] = `${self.cpuData.registers.A}`;
                break;

            case 'STX':
                self.cpuData.memoryArray[operandLocation] = `${self.cpuData.registers.X}`;
                break;

            case 'STY':
                self.cpuData.memoryArray[operandLocation] = `${self.cpuData.registers.Y}`;
                break;

            case 'TAX':
                self.cpuData.registers.X = cpuData.registers.A;
                break;

            case 'TXA':
                self.cpuData.registers.A = cpuData.registers.X;
                break;

            case 'TAY':
                self.cpuData.registers.Y = cpuData.registers.A;
                break;

            case 'TYA':
                self.cpuData.registers.A = cpuData.registers.Y;
                break;

            default:
                break;
        }

        self.writeMemory();
        
        self.cpuData.programCounter++;
        if(self.cpuData.programCounter >= self.cpuData.memoryArray.length){ self.cpuData.programCounter = 0; }
    };
    self.clockTick = () => {
        if(self.cpuData.clockState == 1){
            self.clock.style.color = '#FF0000';
            self.loaderRun();
            self.cpuData.clockState = 0;
        }
        else{
            self.clock.style.color = '#800000';
            self.cpuData.clockState = 1;
        }
    };

    self.intervalHandle = self.setInterval(self.clockTick, 1000);
