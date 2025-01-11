<h1 align="center">Simply Served</h1>

<div align="center">

[![npm latest package](https://img.shields.io/npm/v/@mui/material/latest.svg)](https://www.npmjs.com/package/simply-served)

</div>

# Overview

A light-weight node server framework designed to speed up server development

Simply served is designed around the idea that the basic function of a server is to access and manipulate data while enforcing permissions and data integrity.

The intent of this framework is to to make it easy to extends the server by simply creating a model, permissions around that model. A key feature to the framework is auto-generation of REST endpoints with basic CRUD operations based on the model and permissions.

# Example

Check out this [Example Server](https://github.com/WesleyEdwards/simply-served/example).


# Dependencies
While this framework attempts to avoid unnecessary coupling to other libraries, the following popular libraries offer dependable and extensible functionality to the framework:
- [Express.js](https://www.npmjs.com/package/express) is used as the underlying backbone for https requests
- [Zod](https://www.npmjs.com/package/zod) is the validation library used to ensure data integrity

## Database
Simply Served isn't tied to any single server. All interactions with the database are represented using an interface abstracted from direct Database communication. This interface uses a custom [condition system](https://github.com/WesleyEdwards/simply-served/docs/Condition.md) based on (but not reliant on) mongo.db condition system.
