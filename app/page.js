"use client";

import { Button, Input } from "@material-tailwind/react";
import { useState } from "react";
import { parse } from "csv-parse/browser/esm";

export default function Home() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");

  const readCSV = async (file) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const content = e.target.result;
      const [keys, ...rest] = content
        .toString()
        .trim()
        .split("\n")
        .map((item) => item.split(","));
      // console.log("CSV keys: ", keys);
      // console.log("CSV values: ", rest);

      const formedArr = rest.map((item) => {
        const object = {};
        keys.forEach((key, index) => (object[key] = item.at(index)));
        return object;
      });

      console.log("CSV formedArr: ", formedArr);

      formedArr.sort((a, b) => a.Founded - b.Founded);

      const numbers = formedArr.map((item) => parseInt(item["Founded"]));
      console.log("CSV numbers: ", numbers);

      const uniqueNumbers = [...new Set(numbers)];

      // Sort the unique numbers in ascending order
      uniqueNumbers.sort((a, b) => a - b);

      // Calculate the range of each class
      const range = Math.ceil(uniqueNumbers.length / 10);

      // Initialize the result array
      const classes = [];

      // Divide the unique numbers into classes
      for (let i = 0; i < uniqueNumbers.length; i += range) {
        const lowerLimit = uniqueNumbers[i];
        const upperLimit =
          uniqueNumbers[Math.min(i + range - 1, uniqueNumbers.length - 1)];
        classes.push({ lowerLimit, upperLimit });
      }

      console.log("CSV classes:", classes);
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-3 flex flex-col gap-3">
      <Input
        placeholder="Upload file"
        type="file"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <Button onClick={() => readCSV(file)} disabled={!file}>
        Read CSV
      </Button>
      <h1 className="text-black">{text}</h1>
    </div>
  );
}
