## Installation

- Clone the project:

```bash
$ git clone https://github.com/geek-ayush/mediasoup-webrtc.git
$ cd mediasoup-webrtc
```

- Set up the mediasoup server:

```bash
$ cd server
$ npm install
```

- Copy `config.example.js` as `config.js` and customize it for your scenario:

```bash
$ cp config.example.js config.js
```

**NOTE:** To be perfectly clear, "customize it for your scenario" is not something "optional". If you don't set proper values in `config.js` the application **won't work**.

- Create certificate by using following command:

```bash
$ openssl req -x509 -nodes -days 730 -newkey rsa:2048 -keyout privkey.pem -out fullchain.pem -config req.cnf -sha256
```

and store the generated certificates to `server/certs/`

- Set up the mediasoup browser app:

```bash
$ cd app
$ npm install
```

## Run it locally

- Run the Node.js server application in a terminal:

```bash
$ cd server
$ npm start
```

- In a different terminal build and run the browser application:

```bash
$ cd app
$ npm start
```

- Enjoy.
