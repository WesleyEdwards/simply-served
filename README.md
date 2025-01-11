# simply-served

A simple node server framework designed to speed up server development.

Simply served is designed around the idea that the basic function of a server is to access and manipulate data while enforcing permissions and data integrity. The intent of this framework is to to make it easy to extends the server by simply creating a model, permissions around that model. A key feature to the framework is auto-generation of REST endpoints with basic CRUD operations based on the model and permissions. Beyond that, this framework supports side-effects to modifying data, and still exposes the ability to make custom endpoints.

