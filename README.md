# Commander Cortex

[Generally Genius](https://corsaircoalition.github.io/) (GG) is a modular generals.io bot framework for development and analysis of game strategies and actions. [CorsairCoalition](https://corsaircoalition.github.io/) is a collection of components that form the GG framework.

Commander Cortex is the user interface that controls the bot framework, displays game status, and synchronizes other compenents.

## Configuration

Download `config.example.json` from the [documentation repository](https://github.com/CorsairCoalition/docs) and make desired changes.

To setup other components, see the [detailed instructions](https://corsaircoalition.github.io/setup/) on the [project website](https://corsaircoalition.github.io/).

## Execution

Install and run the executable:

```sh
npm install -g @corsaircoalition/commander-cortex
commander-cortex config.json
```

or run directly from npm library:

```sh
npx @corsaircoalition/commander-cortex config.json
```

or use docker:

```sh
docker run -it -v ./config.json:/config.json ghcr.io/corsaircoalition/commandercortex:latest
```

## Usage

```
Usage: @corsaircoalition/commander-cortex [options] <configFile>

a modular generals.io bot framework for development and analysis of game strategies and actions

Options:
  -V, --version  output the version number
  -d, --debug    enable debugging (default: false)
  -h, --help     display help for command
```
