import express from 'express';
import jwt from 'jsonwebtoken';
import { publicKey } from './publickey';
import * as I from '../../types/interfaces';
import { customer } from './../api';

export const verifyToken: express.RequestHandler = async (req, res) => {
	if (!req.body || !req.body.token) return res.sendStatus(422);
	try {
		const result = jwt.verify(req.body.token, publicKey, { algorithms: ['RS256'] }) as I.Customer;
		if (result.user && result.license) {
			customer.customer = result;
			return res.json(result);
		}
		return res.sendStatus(403);
	} catch {
		return res.sendStatus(403);
	}
};

export const getCurrent: express.RequestHandler = async (req, res) => {
	if (customer.customer) {
		return res.json(customer.customer);
	}
	return res.sendStatus(403);
};
export const logout: express.RequestHandler = async (req, res) => {
	customer.customer = null;
	return res.sendStatus(200);
};
