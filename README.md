# Installation
## Docker compose
  ```
  version: '2.0'

  volumes:
    data:

  services:
    app:
      build: .
      volumes:
        - data:/data
      environment:
        - TOKEN=<Discord Bot Token>
        - CLIENT_ID=<Discord App Client Id>
        - GUILD_ID=<Discord Server Id>
      restart: always
  ```


# Usage
## Command
+ /add `<url>` : Add an EVGA product to get notification when product is available.
+ /del `<index>` : Remove an EVGA product from tracking list.
+ /ls : Show tracking list.
+ /tg : Toggle notifications for current channel.
+ /tgm `<index>`: Toggle mentions for a product.