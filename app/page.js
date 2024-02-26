"use client";

import { Button, Input } from "@material-tailwind/react";
import { useState } from "react";
import { parse } from "csv-parse/browser/esm";
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import data_prove from "@/circuit/data_prove/target/data_prove.json";
import { BigNumber, ethers } from "ethers";

export default function Home() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");

  const readCSV = async (file) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
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

      // Remove items from formedArr if "Founded" property is not a number
      const filteredArr = formedArr.filter((item) => !isNaN(item["Founded"]));

      filteredArr.sort((a, b) => a.Founded - b.Founded);

      const numbers = filteredArr.map((item) => parseInt(item["Founded"]));
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

      const modifiedArr = filteredArr.map((item) => {
        const founded = parseInt(item["Founded"]);
        const classIndex = classes.findIndex(
          (item) => founded >= item.lowerLimit && founded <= item.upperLimit
        );

        if (classIndex === -1) {
          return {
            input: null,
            lowerLimit: "N/A",
            upperLimit: "N/A",
          };
        }
        const { lowerLimit, upperLimit } = classes[classIndex];

        return {
          input: founded,
          lowerLimit,
          upperLimit,
        };
      });

      console.log("CSV modifiedArr:", modifiedArr);

      const backend = new BarretenbergBackend(data_prove, {
        threads: navigator.hardwareConcurrency,
      });
      const noir = new Noir(data_prove, backend);

      const proofArray = [];
      for (const item of modifiedArr) {
        const { input, lowerLimit, upperLimit } = item;
        if (input === null) {
          proofArray.push({
            lowerLimit,
            upperLimit,
            proof: null,
          });
        } else {
          const inputs = {
            min: ethers.utils.hexZeroPad(ethers.utils.hexlify(lowerLimit), 32),
            max: ethers.utils.hexZeroPad(ethers.utils.hexlify(upperLimit), 32),
            data: ethers.utils.hexZeroPad(ethers.utils.hexlify(input), 32),
          };

          try {
            const proof = await noir.generateFinalProof(inputs);

            proofArray.push({
              lowerLimit,
              upperLimit,
              proof: ethers.utils.hexlify(proof.proof),
            });
          } catch (error) {
            console.log(lowerLimit, upperLimit, input);
          }
        }
      }

      console.log("CSV proofArray:", proofArray);
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
