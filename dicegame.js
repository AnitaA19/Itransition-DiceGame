const crypto = require("crypto");
const readLine = require("readline-sync");
const chalk = require("chalk");
const Table = require('cli-table3');

class KeyGeneration {
    static generate() {
        return crypto.randomBytes(32).toString("hex");
    }
}

class HMAC {
    static calculate(secretKey, value) {
        return crypto.createHmac("sha256", secretKey)
            .update(value.toString())
            .digest("hex")
            .toUpperCase();
    }
}

class Dice {
    constructor(values) {
        this.values = values;
    }

    roll() {
        return this.values[Math.floor(Math.random() * this.values.length)];
    }

    toString() {
        return this.values.join(",");
    }
}

class RandomChoice {
    static randomChoice(min, max) {
        return crypto.randomInt(min, max + 1);
    }
}

class ProbabilityTable {
    static generate(diceConfigs) {
        console.log(chalk.yellow("\nProbability of the win for the user:\n"));

        const table = new Table({
            chars: {
                'top': '-', 'top-mid': '+', 'top-left': '+', 'top-right': '+',
                'bottom': '-', 'bottom-mid': '+', 'bottom-left': '+', 'bottom-right': '+',
                'left': '|', 'left-mid': '+', 'mid': '-', 'mid-mid': '+',
                'right': '|', 'right-mid': '+', 'middle': '|'
            },
            style: { head: [], border: [], compact: true }
        });

        const header = ['User  dice v', ...diceConfigs.map(dice => dice.join(','))];
        table.push(header);

        diceConfigs.forEach((dice1, i) => {
            const row = [dice1.join(',')];
            diceConfigs.forEach((dice2, j) => {
                const probability = this.calculateProbability(dice1, dice2);
                row.push(i === j ? `- (${probability})` : probability);
            });
            table.push(row);
        });

        console.log(table.toString());
    }

    static calculateProbability(dice1, dice2) {
        let wins = 0;
        let total = dice1.length * dice2.length;

        for (let v1 of dice1) {
            for (let v2 of dice2) {
                if (v1 > v2) wins++;
            }
        }

        return (wins / total).toFixed(4);
    }
}

class Player {
    constructor(name) {
        this.name = name;
        this.choice = null;
        this.secretKey = KeyGeneration.generate();
    }
    
    makeChoice(diceValues) {
        this.choice = diceValues[Math.floor(Math.random() * diceValues.length)];
        console.log(`${this.name} choice: ${this.choice}`);
        return this.choice;
    }

    performThrow(diceConfigs) {
        const randomIndex = RandomChoice.randomChoice(0, diceConfigs.length - 1);
        const hmac = HMAC.calculate(this.secretKey, randomIndex);
    
        console.log(chalk.yellow(`\nIt's time for ${this.name}'s throw.`));
        console.log(chalk.blue(`I selected a random value in the range 0..5 (HMAC=${hmac})`));
    
        console.log("Add your number modulo 6.");
        console.log("0 - 0\n1 - 1\n2 - 2\n3 - 3\n4 - 4\n5 - 5\nX - exit\n? - help");
    
        while (true) {
            const input = readLine.question(chalk.cyan("Your selection: "));
    
            if (input.toUpperCase() === 'X') {
                process.exit(0);
            }
    
            if (input === '?') {
                ProbabilityTable.generate(diceConfigs);
                continue;
            }
    
            const playerNumber = parseInt(input);
    
            if (isNaN(playerNumber) || playerNumber < 0 || playerNumber > 5) {
                console.log(chalk.red("Invalid input. Please enter a number between 0 and 5."));
                continue;
            }
    
            const computerRandomNumber = RandomChoice.randomChoice(0, 5);
            console.log(`My number is ${computerRandomNumber} (KEY=${this.secretKey}).`);
    
            const result = (computerRandomNumber + playerNumber) % 6;
            console.log(`The result is ${computerRandomNumber} + ${playerNumber} = ${result} (mod 6).`);
            
            const playerThrowValue = diceConfigs[randomIndex][result];
            console.log(`${this.name}'s throw is ${playerThrowValue}.`);
    
            return {
                computerNumber: computerRandomNumber,
                playerNumber: playerNumber,
                playerThrow: playerThrowValue
            };
        }
    }
}

class Game {
    constructor (diceConfigs) {
        this.diceConfigs = diceConfigs;
        this.player = new Player("Player");
        this.computer = new Player("Computer");
    }

    start() {
        console.log(chalk.green("> Starting the game with the dice configurations:"));
        this.diceConfigs.forEach((dice, index) => {
            console.log(`Dice ${index}: ${dice.join(", ")}`);
        });
        this.selectFirstMove();
    }

    selectFirstMove() {
        console.log(chalk.yellow("\nLet's determine who makes the first move."));
        const randomValue = RandomChoice.randomChoice(0, 1);
        const hmac = HMAC.calculate(this.computer.secretKey, randomValue);

        console.log(chalk.blue(`I selected a random value in the range 0..1 (HMAC=${hmac}).`));
        this.askForGuess(randomValue);
    }

    askForGuess(randomValue) {
        while (true) {
            console.log(chalk.yellow("\nTry to guess my selection."));
            console.log("0 - 0\n1 - 1\nX - exit\n? - help");
        
            let guess = readLine.question(chalk.cyan("Your selection: "));
            
            if (guess.toUpperCase() === 'X') {
                process.exit(0);
            }
            
            if (guess === '?') {
                ProbabilityTable.generate(this.diceConfigs);
                continue;
            }
        
            guess = parseInt(guess);
            if (isNaN(guess) || (guess !== 0 && guess !== 1)) {
                console.log(chalk.red("Invalid input. Please enter 0 or 1."));
                continue;
            }
        
            console.log(`My selection: ${randomValue} (KEY=${this.computer.secretKey}).`);
        
            this.firstMoveSelection(randomValue, guess);
            break;
        }
    }

    firstMoveSelection(randomValue, guess) {
        let firstPlayerDice, secondPlayerDice;
        let firstPlayer, secondPlayer;

        if (guess === randomValue) {
            console.log(chalk.green("You won the first move selection!"));
            firstPlayer = this.player;
            secondPlayer = this.computer;
            
            console.log(chalk.blue("\nChoose your dice:"));
            this.diceConfigs.forEach((dice, index) => {
                console.log(`${index} - ${dice.join(", ")}`);
            });
            console.log("X - exit\n? - help");

            while (true) {
                let input = readLine.question(chalk.cyan("Your selection: "));
                
                if (input.toUpperCase() === 'X') {
                    process.exit(0);
                }
                
                if (input === '?') {
                    ProbabilityTable.generate(this.diceConfigs);
                    continue;
                }

                let diceChoice = parseInt(input);
                if (isNaN(diceChoice) || diceChoice < 0 || diceChoice >= this.diceConfigs.length) {
                    console.log(chalk.red("Invalid dice choice."));
                    continue;
                }

                firstPlayerDice = this.diceConfigs[diceChoice];
                console.log(`You choose the dice: ${firstPlayerDice.join(", ")}`);
                
                const remainingDice = this.diceConfigs.filter(dice => dice !== firstPlayerDice);
                
                console.log(chalk.blue("\nComputer selecting its dice:"));
                remainingDice.forEach((dice, index) => {
                    console.log(`${index} - ${dice.join(", ")}`);
                });
                
                const computerDiceIndex = RandomChoice.randomChoice(0, remainingDice.length - 1);
                secondPlayerDice = remainingDice[computerDiceIndex];
                console.log(`Computer chooses the dice: ${secondPlayerDice.join(", ")}`);
                break;
            }
        } else {
            console.log(chalk.green("Computer won the first move selection."));
            firstPlayer = this.computer;
            secondPlayer = this.player;
            
            const firstDiceIndex = RandomChoice.randomChoice(0, this.diceConfigs.length - 1);
            firstPlayerDice = this.diceConfigs[firstDiceIndex];
            console.log(`I make the first move and choose the [${firstPlayerDice.join(",")}] dice.`);
            
            const remainingDice = this.diceConfigs.filter(dice => dice !== firstPlayerDice);
            
            console.log(chalk.blue("\nChoose your dice:"));
            remainingDice.forEach((dice, index) => {
                console.log(`${index} - ${dice.join(", ")}`);
            });
            console.log("X - exit\n? - help");

            while (true) {
                let input = readLine.question(chalk.cyan("Your selection: "));
                
                if (input.toUpperCase() === 'X') {
                    process.exit(0);
                }
                
                if (input === '?') {
                    ProbabilityTable .generate(this.diceConfigs);
                    continue;
                }

                let diceChoice = parseInt(input);
                if (isNaN(diceChoice) || diceChoice < 0 || diceChoice >= remainingDice.length) {
                    console.log(chalk.red("Invalid dice choice."));
                    continue;
                }

                secondPlayerDice = remainingDice[diceChoice];
                console.log(`You choose the dice: ${secondPlayerDice.join(", ")}`);
                break;
            }
        }

        const firstPlayerResult = firstPlayer.performThrow(this.diceConfigs);
        firstPlayer.choice = firstPlayerResult.playerThrow;

        const secondPlayerResult = secondPlayer.performThrow(this.diceConfigs);
        secondPlayer.choice = secondPlayerResult.playerThrow;

        console.log(chalk.yellow("\nComparing throws:"));
        if (firstPlayer.choice > secondPlayer.choice) {
            console.log(chalk.green(`${firstPlayer.name} wins!`));
        } else if (firstPlayer.choice < secondPlayer.choice) {
            console.log(chalk.green(`${secondPlayer.name} wins!`));
        } else {
            console.log(chalk.yellow("It's a tie!"));
        }
    }
}

function validateArgs(args) {
    if (args.length < 5) {
        console.error(chalk.red("Error: You must specify at least 3 dice configurations with 6 integers each."));
        console.log("Example: node game.js 2,2,4,4,9,9 6,8,1,1,8,6 7,5,3,7,5,3");
        process.exit(1);
    }

    const diceConfigs = [];

    for (let i = 2; i < args.length; i++) {
        const values = args[i].split(',').map(Number);
        if (values.length !== 6 || !values.every(v => !isNaN(v))) {
            console.error(chalk.red(`Invalid dice configuration: ${args[i]}. Please ensure it's a comma-separated list of 6 integers.`));
            process.exit(1);
        }
        diceConfigs.push(values);
    }
    
    return diceConfigs;
}

const args = process.argv;

const diceConfigs = validateArgs(args);

const game = new Game(diceConfigs);
game.start();