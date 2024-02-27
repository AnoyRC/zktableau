"use client";

import { Button, Input } from "@material-tailwind/react";
import { useState } from "react";
import { parse } from "csv-parse/browser/esm";
import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
import { Noir } from "@noir-lang/noir_js";
import data_prove from "@/circuit/data_prove/target/data_prove.json";
import { BigNumber, ethers } from "ethers";
import Papa from "papaparse";

export default function Home() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState("");
  const [proofFile, setProofFile] = useState(null);

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
          uniqueId: item["Organization Id"],
        };
      });

      console.log("CSV modifiedArr:", modifiedArr);

      const backend = new BarretenbergBackend(data_prove, {
        threads: navigator.hardwareConcurrency,
      });
      const noir = new Noir(data_prove, backend);

      const proofArray = [];
      for (const item of modifiedArr) {
        const { input, lowerLimit, upperLimit, uniqueId } = item;
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
              uniqueId: uniqueId,
            });
          } catch (error) {
            console.log(lowerLimit, upperLimit, input);
          }
        }
      }

      console.log("CSV proofArray:", proofArray);

      const csv = Papa.unparse(proofArray);

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = "output.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    reader.readAsText(file);
  };

  const verifyCSV = async (file) => {
    const reader = new FileReader();

    reader.onload = async function (e) {
      const content = e.target.result;
      const [keys, ...rest] = content
        .toString()
        .trim()
        .split("\n")
        .map((item) => item.split(","));

      const formedArr = rest.map((item) => {
        const object = {};
        keys.forEach((key, index) => (object[key] = item.at(index)));
        return object;
      });

      console.log("Proof CSV formedArr: ", formedArr);

      const backend = new BarretenbergBackend(data_prove, {
        threads: navigator.hardwareConcurrency,
      });
      const noir = new Noir(data_prove, backend);

      for (const item of formedArr) {
        const { lowerLimit, upperLimit, proof, uniqueId } = item;

        const publicInputs = new Map();

        publicInputs.set(
          "min",
          ethers.utils.hexZeroPad(ethers.utils.hexlify(Number(lowerLimit)), 32)
        );
        publicInputs.set(
          "max",
          ethers.utils.hexZeroPad(ethers.utils.hexlify(Number(upperLimit)), 32)
        );

        if (proof === "null") {
          console.log(
            `Organization with uniqueId: ${uniqueId} has no proof for range: [${lowerLimit}, ${upperLimit}]`
          );
          break;
        } else {
          const inputs = {
            publicInputs,
            proof: Array.from(ethers.utils.arrayify(proof)),
          };

          const result = await noir.verifyFinalProof(inputs);

          if (result) {
            console.log(
              `Organization with uniqueId: ${uniqueId} has a valid proof for range: [${lowerLimit}, ${upperLimit}]`
            );
          } else {
            console.log(
              `Organization with uniqueId: ${uniqueId} has an invalid proof for range: [${lowerLimit}, ${upperLimit}]`
            );
            break;
          }
        }
      }
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
      <Input
        placeholder="Upload proof file"
        type="file"
        onChange={(e) => setProofFile(e.target.files[0])}
      />
      <Button onClick={() => verifyCSV(proofFile)} disabled={!proofFile}>
        Verify Proof
      </Button>
    </div>
  );
}
