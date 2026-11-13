import app from "./app.js";
import { seed } from "./services/data.js";

const port = process.env.PORT || 3000;

// no database: load the demo objects into memory before accepting requests
seed();

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});