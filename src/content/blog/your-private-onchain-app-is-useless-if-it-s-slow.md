---
title: "Your private onchain app is useless if it's slow."
date: '2026-11-02'
summary: >-
  On Arbitrum Sepolia, a full encrypted shot in Confidential Battleship takes 2.10 seconds. On Ethereum Sepolia it takes 25.60. Every confidential action needs two onchain transactions, so the chain's
tags:
  - slug: posts
    collection: tags
authors:
  - default
canonicalUrl: 'https://x.com/hummusonrails/article/2117330683903488494'
images: 'https://pbs.twimg.com/media/HWJFA4SaoAAfaNd.jpg'
---

On Arbitrum Sepolia, a full encrypted shot in Confidential Battleship takes 2.10 seconds. On Ethereum Sepolia it takes 25.60. Every confidential action needs two onchain transactions, so the chain's speed decides whether anyone will use your app.

You pick a square on a board nobody can see. The player can't see the fleet, the deployer can't, and the contract can't either. About two seconds later, you know whether you hit a ship.

Fhenix CoFHE brings this kind of confidential compute to Arbitrum. Its contracts are deployed on Arbitrum One with go-live in progress, and everything below runs on Arbitrum Sepolia today. Each shot is a transaction, a CoFHE decryption and a second transaction that publishes the answer.

## What a confidential shot does

If you write Solidity, CoFHE's model will feel familiar. Your contract works with handles to encrypted values through the FHE.sol library. The operations are recorded onchain, and the coprocessor runs the heavy FHE math offchain. Decryption is permissioned, so you decide which result gets revealed and to whom.

Battleship places its fleet with FHE.randomEuint8. Four ships land on the board and stay encrypted for the whole game, so nobody can read them: the player, the deployer and the contract included.

A shot runs in three stages. First, the fire transaction lands onchain and the contract checks the cell against the encrypted fleet, producing an encrypted result. Then CoFHE decrypts only that answer and signs it. Finally, the reveal transaction publishes miss, hit or sunk onchain. You see the outcome of your shot and keep playing, and the rest of the fleet stays hidden.

That's the design question to carry into your own app. Decide what your user needs to learn from an action, then shape the encrypted computation so that answer is the only thing that becomes public.

## The contract patterns worth copying

The shot logic in Battleship.sol is a handful of lines, and four ideas in it carry over to any confidential contract.

Solidity can't branch on an encrypted boolean, so the contract uses FHE.select to pick between encrypted outcomes. It computes whether the shot hit and whether that hit sank the ship, all under FHE, and folds both into a single encrypted euint8: 0 for miss, 1 for hit, 2 for sunk.

Packing the outcome into one value means CoFHE decrypts once per shot. Every extra value you reveal is another decryption your user waits on, so it's worth designing the answer as one number from the start.

Before the Shot event fires, the contract calls FHE.allowThis so it can keep using the result, and FHE.allowPublic so anyone can decrypt that one value. Those permissions apply only to the shot result. The fleet stays encrypted.

Every shot also runs the same FHE operations whatever the answer is. Gas use then says nothing about whether a cell was a miss, a hit or a sink, which keeps the secret safe from anyone watching transactions.

## Where the time goes

The repo's measured speed tables report these medians from October 29, 2026, Arbitrum Sepolia first and Ethereum Sepolia second:

- Fire, shot included onchain: 0.46 s and 11.41 s
- Decrypt, CoFHE compute and decryption: 1.23 s and 0.22 s
- Reveal, answer published onchain: 0.38 s and 11.59 s
- Whole shot: 2.10 s and 25.60 s
Two of the three stages wait on the chain. Arbitrum Sepolia averaged a block every 259 ms in the same measurements, so each onchain stage lands in under half a second and CoFHE's own computation becomes the largest stage. Ethereum Sepolia averaged 12.01 s per block, and CoFHE finishes while the next block is still on its way, which is why its decrypt stage looks short.

You can watch that add up in the side by side race. Every cell is fired on both chains at once, in real time. Arbitrum Sepolia sank the whole fleet in 93.8 seconds across 31 shots, and Ethereum Sepolia finished 3 shots in the same time. The race page lets you run it yourself.

These numbers come from this app on Sepolia testnets on that date. They show what the chain contributes when every action needs two transactions. On Arbitrum, the confidential computation is the main cost, and the game plays like a game.

## Build your first confidential app

Clone Confidential Battleship and run it locally. It uses the contracts already deployed on Arbitrum Sepolia, so you can fund the in-browser key from the Wallet dialog and start firing within a couple of minutes.

Then trace one shot end to end, from the fire and reveal functions in the contract to the shot pipeline in the web client. The client asks the CoFHE SDK for each decryption and gets every transaction receipt back in the same call that sends it, which keeps the time your user waits close to what the chain and CoFHE take.

Once you can point to the exact line where a result becomes public, change one mechanic. Keep the state encrypted and reveal only the answer your user needs, then check that every path still does the same FHE work. If you build with a coding agent, the fhenix-toolkit skills teach it the current FHE.sol and CoFHE SDK patterns, including review for leaks through gas.

Clone the Confidential Battleship repo and build your first confidential app on Arbitrum with Fhenix CoFHE.
