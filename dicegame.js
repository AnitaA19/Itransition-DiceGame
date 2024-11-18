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

class Player {
    constructor(name) {
        this.name = name;
        this.choice = null;
    }

    makeChoice(diceValues) {
        while (true) {
            console.log(`${chalk.blue(`\n${this.name}, choose your dice value: `)}${chalk.green(diceValues.join(", "))}`);
            const choice = readLine.questionInt(chalk.cyan("Your choice: "));
            if (diceValues.includes(choice)) {
                this.choice = choice;
                break;
            } else {
                console.log(chalk.red("Invalid choice. Please select a valid dice value."));
            }
        }
    }
}

class ComputerPlays extends Player {
    constructor() {
        super("Computer");
        this.secretKey = KeyGeneration.generate();
    }

    makeChoice(dice) {
        this.choice = dice.roll();
    }
}

class TurnHandler {
    static handlePlayerTurn(diceConfigs, player) {
        console.log(chalk.blue("\nChoose your dice:"));
        diceConfigs.forEach((dice, index) => {
            console.log(`${index} - ${dice.values.join(", ")}`);
        });

        let diceChoice = readLine.questionInt(chalk.cyan("Your selection: "));
        if (diceChoice < 0 || diceChoice >= diceConfigs.length) {
            console.log(chalk.red("Invalid dice choice."));
            return;
        }

        let dice = diceConfigs[diceChoice];
        console.log(`You choose the dice: ${dice.values.join(", ")}`);
        player.makeChoice(dice.values);
        console.log(`Your choice is: ${player.choice}`);
    }

    static handleComputerTurn(diceConfigs, computer) {
        console.log(chalk.yellow("\nIt's time for my throw."));
        const randomIndex = RandomChoice.randomChoice(0, diceConfigs.length - 1);
        const hmac = HMAC.calculate(computer.secretKey, randomIndex);
        console.log(chalk.blue(`I selected a random value in the range 0..${diceConfigs.length - 1} (HMAC=${hmac}).`));

        return randomIndex;
    }
}

class Outcome {
    static checkOutcome(playerThrow, computerThrow) {
        if (playerThrow > computerThrow) {
            console.log(chalk.green("\nYou win!"));
        } else if (playerThrow < computerThrow) {
            console.log(chalk.red("\nYou lost!"));
        } else {
            console.log(chalk.yellow("\nIt's a tie!"));
        }
    }
}

class ProbabilityTable {
    static generate(diceConfigs) {
        console.log(chalk.yellow("\nProbability of winning for the user:\n"));
        
        const table = new Table({
            head: ['User dice v', ...diceConfigs.map(d => d.toString())].map(h => chalk.cyan(h)),
            colWidths: [20, ...Array(diceConfigs.length).fill(15)],
            style: { head: ['cyan'], border: ['gray'] }
        });

        diceConfigs.forEach((dice1, i) => {
            const row = [dice1.toString()];
            diceConfigs.forEach((dice2, j) => {
                if (i === j) {
                    row.push(`- (${this.calculateProbability(dice1, dice2)})`);
                } else {
                    row.push(this.calculateProbability(dice1, dice2));
                }
            });
            table.push(row);
        });

        console.log(table.toString());
    }

    static calculateProbability(dice1, dice2) {
        let wins = 0;
        let total = dice1.values.length * dice2.values.length;

        for (let v1 of dice1.values) {
            for (let v2 of dice2.values) {
                if (v1 > v2) wins++;
            }
        }

        return (wins / total).toFixed(4);
    }
}

class Game {
    constructor(diceConfigs) {
        this.diceConfigs = diceConfigs.map(config => new Dice(config));
        this.player = new Player("Player");
        this.computer = new ComputerPlays();
    }

    start() {
        console.log(chalk.green("> Starting the game with the dice configurations:"));
        this.selectFirstMove();
        TurnHandler.handlePlayerTurn(this.diceConfigs, this.player);
        this.computerTurn();
    }

    selectFirstMove() {
        console.log(chalk.yellow("\nLet's determine who makes the first move."));
        const randomValue = RandomChoice.randomChoice(0, 1);
        const hmac = HMAC.calculate(this.computer.secretKey, randomValue);

        console.log(chalk.blue(`I selected a random value in the range 0..1 (HMAC=${hmac}).`));
        this.askForGuess(randomValue);
    }

    askForGuess(randomValue) {
        console.log(chalk.yellow("\nTry to guess my selection."));
        console.log("0 - 0\n1 - 1\nX - exit\n? - help");
    
        let guess = readLine.question(chalk.cyan("Your selection: "));
        if (guess.toUpperCase() === 'X') {
            process.exit(0);
        }
        
        if (guess === '?') {
            ProbabilityTable.generate(this.diceConfigs);
            return this.askForGuess(randomValue);
        }
    
        guess = parseInt(guess);
        if (isNaN(guess) || (guess !== 0 && guess !== 1)) {
            console.log(chalk.red("Invalid input. Please enter 0 or 1."));
            return this.askForGuess(randomValue);
        }
    
        console.log(`My selection: ${randomValue}`);
        console.log(`KEY=${this.computer.secretKey}`);
    
        this.firstMoveSelection(randomValue);
    }

    firstMoveSelection(randomValue) {
        let dice;
        if (randomValue === 0) {
            dice = this.diceConfigs[0];
            console.log("I make the first move and choose the first dice.");
        } else {
            dice = this.diceConfigs[1];
            console.log("I make the first move and choose the second dice.");
        }

        this.computer.makeChoice(dice);
        console.log(`My selection is: ${this.computer.choice}`);
    }

    computerTurn() {
        const randomIndex = TurnHandler.handleComputerTurn(this.diceConfigs, this.computer);
        console.log("Add your number modulo 6.");
        console.log("0 - 0\n1 - 1\n2 - 2\n3 - 3\n4 - 4\n5 - 5\nX - exit\n? - help");

        let playerNumber;
        while (true) {
            const input = readLine.question(chalk.cyan("Your selection: "));
            if (input.toUpperCase() === 'X') {
                process.exit(0);
            }
            if (input === '?') {
                ProbabilityTable.generate(this.diceConfigs);
                continue;
            }
            playerNumber = parseInt(input);
            if (isNaN(playerNumber) || playerNumber < 0 || playerNumber > 5) {
                console.log(chalk.red("Invalid input. Please enter a number between 0 and 5."));
                continue;
            }
            break;
        }

        const result = (randomIndex + playerNumber) % 6;
        console.log(`The result is ${randomIndex} + ${playerNumber} = ${result} (mod 6).`);
        console.log(`KEY=${this.computer.secretKey}`);

        this.computerFinalThrow(result);
    }

    computerFinalThrow(modResult) {
        const computerThrow = this.diceConfigs[0].values[modResult];
        console.log(`My throw is: ${computerThrow}`);
        Outcome.checkOutcome(this.player.choice, computerThrow);
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
        if (values.length !== 6 || !values.every(num => Number.isInteger(num))) {
            console.error(chalk.red(`Error: Invalid dice configuration: ${args[i]}. Please provide 6 integers for each dice.`));
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
